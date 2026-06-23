import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';

export interface OsItemPeca {
  id?: number;
  peca_id: number;
  quantidade: number;
  valor_unitario: number;
  codigo?: string;
  descricao?: string;
}

export interface OsItemServico {
  id?: number;
  servico_id: number;
  quantidade: number;
  valor_unitario: number;
  descricao?: string;
}

export interface OrdemServico {
  id?: number;
  cliente_id: number;
  veiculo_id: number;
  status: 'Orçamento' | 'Aprovado' | 'Em Execução' | 'Aguardando Peças' | 'Concluído' | 'Cancelado';
  data_abertura?: Date;
  data_conclusao?: Date | null;
  valor_mao_obra: number;
  valor_total: number;
  observacoes?: string | null;
  cliente_nome?: string;
  veiculo_placa?: string;
  veiculo_modelo?: string;
  pecas?: OsItemPeca[];
  servicos?: OsItemServico[];
}

export class OrdemServicoService {
  async getAll(): Promise<OrdemServico[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT os.*, c.nome as cliente_nome, v.placa as veiculo_placa, v.modelo as veiculo_modelo 
       FROM ordens_servico os 
       JOIN clientes c ON os.cliente_id = c.id 
       JOIN veiculos v ON os.veiculo_id = v.id 
       ORDER BY os.data_abertura DESC`
    );
    return rows as OrdemServico[];
  }

  async getById(id: number): Promise<OrdemServico | null> {
    const [osRows] = await pool.query<RowDataPacket[]>(
      `SELECT os.*, c.nome as cliente_nome, v.placa as veiculo_placa, v.modelo as veiculo_modelo 
       FROM ordens_servico os 
       JOIN clientes c ON os.cliente_id = c.id 
       JOIN veiculos v ON os.veiculo_id = v.id 
       WHERE os.id = ?`,
      [id]
    );

    if (osRows.length === 0) return null;

    const os = osRows[0] as OrdemServico;

    // Buscar peças associadas
    const [pecasRows] = await pool.query<RowDataPacket[]>(
      `SELECT io.*, p.codigo, p.descricao 
       FROM itens_os_pecas io 
       JOIN pecas p ON io.peca_id = p.id 
       WHERE io.ordem_servico_id = ?`,
      [id]
    );
    os.pecas = pecasRows as OsItemPeca[];

    // Buscar serviços associados
    const [servicosRows] = await pool.query<RowDataPacket[]>(
      `SELECT ios.*, s.descricao 
       FROM itens_os_servicos ios 
       JOIN servicos s ON ios.servico_id = s.id 
       WHERE ios.ordem_servico_id = ?`,
      [id]
    );
    os.servicos = servicosRows as OsItemServico[];

    return os;
  }

  async create(os: OrdemServico): Promise<OrdemServico> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Inserir OS
      const [osResult] = await connection.query<ResultSetHeader>(
        `INSERT INTO ordens_servico (cliente_id, veiculo_id, status, valor_mao_obra, valor_total, observacoes) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          os.cliente_id,
          os.veiculo_id,
          os.status || 'Orçamento',
          os.valor_mao_obra || 0,
          os.valor_total || 0,
          os.observacoes || null
        ]
      );

      const osId = osResult.insertId;

      // Inserir Peças se houver
      if (os.pecas && os.pecas.length > 0) {
        for (const peca of os.pecas) {
          await connection.query(
            `INSERT INTO itens_os_pecas (ordem_servico_id, peca_id, quantidade, valor_unitario) 
             VALUES (?, ?, ?, ?)`,
            [osId, peca.peca_id, peca.quantidade, peca.valor_unitario]
          );

          // Se a OS já começar aprovada/execução/concluída, abaixa estoque
          if (['Aprovado', 'Em Execução', 'Concluído'].includes(os.status)) {
            await connection.query(
              'UPDATE pecas SET quantidade_estoque = quantidade_estoque - ? WHERE id = ?',
              [peca.quantidade, peca.peca_id]
            );
          }
        }
      }

      // Inserir Serviços se houver
      if (os.servicos && os.servicos.length > 0) {
        for (const serv of os.servicos) {
          await connection.query(
            `INSERT INTO itens_os_servicos (ordem_servico_id, servico_id, quantidade, valor_unitario) 
             VALUES (?, ?, ?, ?)`,
            [osId, serv.servico_id, serv.quantidade || 1, serv.valor_unitario]
          );
        }
      }

      await connection.commit();
      return { ...os, id: osId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async update(id: number, os: Partial<OrdemServico>): Promise<boolean> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Buscar estado anterior
      const [prevRows] = await connection.query<RowDataPacket[]>(
        'SELECT status FROM ordens_servico WHERE id = ?',
        [id]
      );
      if (prevRows.length === 0) {
        connection.release();
        return false;
      }
      const statusAnterior = prevRows[0].status;

      // Atualizar dados básicos
      const fields: string[] = [];
      const values: any[] = [];

      if (os.cliente_id !== undefined) { fields.push('cliente_id = ?'); values.push(os.cliente_id); }
      if (os.veiculo_id !== undefined) { fields.push('veiculo_id = ?'); values.push(os.veiculo_id); }
      if (os.status !== undefined) { 
        fields.push('status = ?'); 
        values.push(os.status);
        if (os.status === 'Concluído' && statusAnterior !== 'Concluído') {
          fields.push('data_conclusao = CURRENT_TIMESTAMP');
        } else if (os.status !== 'Concluído') {
          fields.push('data_conclusao = NULL');
        }
      }
      if (os.valor_mao_obra !== undefined) { fields.push('valor_mao_obra = ?'); values.push(os.valor_mao_obra); }
      if (os.valor_total !== undefined) { fields.push('valor_total = ?'); values.push(os.valor_total); }
      if (os.observacoes !== undefined) { fields.push('observacoes = ?'); values.push(os.observacoes || null); }

      if (fields.length > 0) {
        values.push(id);
        await connection.query(`UPDATE ordens_servico SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      // Tratar estoque na mudança de status
      const statusAprovados = ['Aprovado', 'Em Execução', 'Concluído', 'Aguardando Peças'];
      const foiAprovado = statusAprovados.includes(os.status || '') && !statusAprovados.includes(statusAnterior);
      const foiCancelado = (os.status === 'Cancelado' || os.status === 'Orçamento') && statusAprovados.includes(statusAnterior);

      if (foiAprovado || foiCancelado) {
        // Obter peças da OS
        const [pecasRows] = await connection.query<RowDataPacket[]>(
          'SELECT peca_id, quantidade FROM itens_os_pecas WHERE ordem_servico_id = ?',
          [id]
        );
        for (const item of pecasRows) {
          const mult = foiAprovado ? -1 : 1; // Se aprovou, reduz estoque (-1 * quant); se cancelou, devolve (+1 * quant)
          await connection.query(
            'UPDATE pecas SET quantidade_estoque = quantidade_estoque + ? WHERE id = ?',
            [item.quantidade * mult, item.peca_id]
          );
        }
      }

      // Se enviou peças novas para substituir as antigas
      if (os.pecas !== undefined) {
        // Se já estava aprovado, precisamos devolver as antigas ao estoque antes de limpar
        if (statusAprovados.includes(statusAnterior)) {
          const [oldPecas] = await connection.query<RowDataPacket[]>(
            'SELECT peca_id, quantidade FROM itens_os_pecas WHERE ordem_servico_id = ?',
            [id]
          );
          for (const item of oldPecas) {
            await connection.query(
              'UPDATE pecas SET quantidade_estoque = quantidade_estoque + ? WHERE id = ?',
              [item.quantidade, item.peca_id]
            );
          }
        }

        // Limpar e re-inserir peças
        await connection.query('DELETE FROM itens_os_pecas WHERE ordem_servico_id = ?', [id]);
        for (const peca of os.pecas) {
          await connection.query(
            `INSERT INTO itens_os_pecas (ordem_servico_id, peca_id, quantidade, valor_unitario) 
             VALUES (?, ?, ?, ?)`,
            [id, peca.peca_id, peca.quantidade, peca.valor_unitario]
          );

          // Se estiver aprovado com a nova lista, reduz estoque
          const statusAtual = os.status || statusAnterior;
          if (statusAprovados.includes(statusAtual)) {
            await connection.query(
              'UPDATE pecas SET quantidade_estoque = quantidade_estoque - ? WHERE id = ?',
              [peca.quantidade, peca.peca_id]
            );
          }
        }
      }

      // Se enviou serviços novos
      if (os.servicos !== undefined) {
        await connection.query('DELETE FROM itens_os_servicos WHERE ordem_servico_id = ?', [id]);
        for (const serv of os.servicos) {
          await connection.query(
            `INSERT INTO itens_os_servicos (ordem_servico_id, servico_id, quantidade, valor_unitario) 
             VALUES (?, ?, ?, ?)`,
            [id, serv.servico_id, serv.quantidade || 1, serv.valor_unitario]
          );
        }
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async delete(id: number): Promise<boolean> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Buscar status e peças para reabastecer estoque se estava ativa
      const [prevRows] = await connection.query<RowDataPacket[]>(
        'SELECT status FROM ordens_servico WHERE id = ?',
        [id]
      );
      if (prevRows.length === 0) {
        connection.release();
        return false;
      }
      
      const status = prevRows[0].status;
      const statusAprovados = ['Aprovado', 'Em Execução', 'Concluído', 'Aguardando Peças'];

      if (statusAprovados.includes(status)) {
        const [pecasRows] = await connection.query<RowDataPacket[]>(
          'SELECT peca_id, quantidade FROM itens_os_pecas WHERE ordem_servico_id = ?',
          [id]
        );
        for (const item of pecasRows) {
          await connection.query(
            'UPDATE pecas SET quantidade_estoque = quantidade_estoque + ? WHERE id = ?',
            [item.quantidade, item.peca_id]
          );
        }
      }

      const [result] = await connection.query<ResultSetHeader>(
        'DELETE FROM ordens_servico WHERE id = ?',
        [id]
      );

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
