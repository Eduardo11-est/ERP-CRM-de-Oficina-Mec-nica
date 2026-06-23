import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface ParcelaFaturamento {
  id?: number;
  faturamento_id?: number;
  numero_parcela: number;
  valor: number;
  forma_pagamento: 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Pix' | 'Boleto';
  status: 'Pendente' | 'Pago' | 'Vencido';
  data_vencimento: string; // YYYY-MM-DD
  data_pagamento?: string | Date | null;
}

export interface Faturamento {
  id?: number;
  ordem_servico_id: number;
  valor_total: number;
  status: 'Pendente' | 'Pago' | 'Parcialmente Pago' | 'Cancelado';
  data_faturamento?: Date;
  parcelas?: ParcelaFaturamento[];
}

export class FaturamentoService {
  async getByOsId(osId: number): Promise<Faturamento | null> {
    const [fatRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM faturamentos WHERE ordem_servico_id = ?',
      [osId]
    );

    if (fatRows.length === 0) return null;
    const faturamento = fatRows[0] as Faturamento;

    const [parcRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM parcelas_faturamento WHERE faturamento_id = ? ORDER BY numero_parcela ASC',
      [faturamento.id]
    );
    faturamento.parcelas = parcRows as ParcelaFaturamento[];

    return faturamento;
  }

  async getById(id: number): Promise<Faturamento | null> {
    const [fatRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM faturamentos WHERE id = ?',
      [id]
    );

    if (fatRows.length === 0) return null;
    const faturamento = fatRows[0] as Faturamento;

    const [parcRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM parcelas_faturamento WHERE faturamento_id = ? ORDER BY numero_parcela ASC',
      [id]
    );
    faturamento.parcelas = parcRows as ParcelaFaturamento[];

    return faturamento;
  }

  async create(faturamento: Faturamento): Promise<Faturamento> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verificar se a OS existe e obter valor total
      const [osRows] = await connection.query<RowDataPacket[]>(
        'SELECT valor_total FROM ordens_servico WHERE id = ?',
        [faturamento.ordem_servico_id]
      );
      if (osRows.length === 0) {
        throw new Error('Ordem de serviço não encontrada');
      }

      // Remover faturamentos anteriores da mesma OS se existirem (para evitar duplicidade)
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM faturamentos WHERE ordem_servico_id = ?',
        [faturamento.ordem_servico_id]
      );
      if (existing.length > 0) {
        await connection.query('DELETE FROM faturamentos WHERE ordem_servico_id = ?', [faturamento.ordem_servico_id]);
      }

      const valorTotal = faturamento.valor_total || osRows[0].valor_total;

      // Inserir Faturamento
      const [fatResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO faturamentos (ordem_servico_id, valor_total, status) VALUES (?, ?, ?)',
        [faturamento.ordem_servico_id, valorTotal, faturamento.status || 'Pendente']
      );

      const faturamentoId = fatResult.insertId;

      // Inserir parcelas
      if (faturamento.parcelas && faturamento.parcelas.length > 0) {
        for (const parc of faturamento.parcelas) {
          await connection.query(
            `INSERT INTO parcelas_faturamento (faturamento_id, numero_parcela, valor, forma_pagamento, status, data_vencimento, data_pagamento) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              faturamentoId,
              parc.numero_parcela,
              parc.valor,
              parc.forma_pagamento,
              parc.status || 'Pendente',
              parc.data_vencimento,
              parc.status === 'Pago' ? (parc.data_pagamento || new Date()) : null
            ]
          );
        }
      } else {
        // Se nenhuma parcela for enviada, cria uma parcela única à vista por padrão
        await connection.query(
          `INSERT INTO parcelas_faturamento (faturamento_id, numero_parcela, valor, forma_pagamento, status, data_vencimento) 
           VALUES (?, 1, ?, 'Dinheiro', 'Pendente', CURDATE())`,
          [faturamentoId, valorTotal]
        );
      }

      // Atualiza status do faturamento baseado nas parcelas salvas
      await this.recalculateFaturamentoStatus(connection, faturamentoId);

      await connection.commit();

      const created = await this.getById(faturamentoId);
      return created!;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async payParcela(parcelaId: number, dataPagamento: string | Date, formaPagamento?: string): Promise<boolean> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Buscar parcela e faturamento correspondente
      const [parcRows] = await connection.query<RowDataPacket[]>(
        'SELECT faturamento_id FROM parcelas_faturamento WHERE id = ?',
        [parcelaId]
      );
      if (parcRows.length === 0) {
        connection.release();
        return false;
      }
      const faturamentoId = parcRows[0].faturamento_id;

      // Atualizar status da parcela
      let query = 'UPDATE parcelas_faturamento SET status = "Pago", data_pagamento = ?';
      const params: any[] = [dataPagamento];

      if (formaPagamento) {
        query += ', forma_pagamento = ?';
        params.push(formaPagamento);
      }
      query += ' WHERE id = ?';
      params.push(parcelaId);

      await connection.query(query, params);

      // Recalcular status geral do faturamento
      await this.recalculateFaturamentoStatus(connection, faturamentoId);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getFaturamentoDetails(): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT f.*, os.id as os_id, c.nome as cliente_nome, v.placa as veiculo_placa 
       FROM faturamentos f 
       JOIN ordens_servico os ON f.ordem_servico_id = os.id 
       JOIN clientes c ON os.cliente_id = c.id 
       JOIN veiculos v ON os.veiculo_id = v.id 
       ORDER BY f.data_faturamento DESC`
    );
    return rows;
  }

  private async recalculateFaturamentoStatus(connection: any, faturamentoId: number): Promise<void> {
    const [parcelas] = await connection.query(
      'SELECT status FROM parcelas_faturamento WHERE faturamento_id = ?',
      [faturamentoId]
    );

    const totalParcelas = parcelas.length;
    const pagas = parcelas.filter((p: any) => p.status === 'Pago').length;
    const pendentes = parcelas.filter((p: any) => p.status === 'Pendente' || p.status === 'Vencido').length;

    let novoStatus: Faturamento['status'] = 'Pendente';
    if (pagas === totalParcelas) {
      novoStatus = 'Pago';
    } else if (pagas > 0) {
      novoStatus = 'Parcialmente Pago';
    }

    await connection.query(
      'UPDATE faturamentos SET status = ? WHERE id = ?',
      [novoStatus, faturamentoId]
    );
  }
}
