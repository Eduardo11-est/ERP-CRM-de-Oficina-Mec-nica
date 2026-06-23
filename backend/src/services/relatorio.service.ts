import pool from '../config/database.js';
import { RowDataPacket } from 'mysql2';

export interface DashboardStats {
  receita_total: number;
  os_ativas: number;
  estoque_critico: number;
  orcamentos_pendentes: number;
  pecas_criticas: any[];
  formas_pagamento: any[];
  faturamento_mensal: any[];
  ultimas_os: any[];
}

export class RelatorioService {
  async getDashboardStats(): Promise<DashboardStats> {
    // 1. Receita Total (Soma de todas as parcelas já pagas)
    const [receitaRows] = await pool.query<RowDataPacket[]>(
      'SELECT COALESCE(SUM(valor), 0) as total FROM parcelas_faturamento WHERE status = "Pago"'
    );
    const receitaTotal = receitaRows[0].total;

    // 2. OS Ativas (Em Execução, Aprovado, Aguardando Peças)
    const [osAtivasRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM ordens_servico WHERE status IN ("Aprovado", "Em Execução", "Aguardando Peças")'
    );
    const osAtivas = osAtivasRows[0].total;

    // 3. Quantidade de itens em estoque crítico
    const [estoqueCritRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM pecas WHERE quantidade_estoque <= quantidade_minima'
    );
    const estoqueCritico = estoqueCritRows[0].total;

    // 4. Quantidade de orçamentos pendentes (status = 'Orçamento')
    const [orcRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM ordens_servico WHERE status = "Orçamento"'
    );
    const orcamentosPendentes = orcRows[0].total;

    // 5. Lista de peças com estoque crítico
    const [pecasRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM pecas WHERE quantidade_estoque <= quantidade_minima ORDER BY quantidade_estoque ASC LIMIT 5'
    );

    // 6. Distribuição por formas de pagamento (de parcelas pagas)
    const [pagtoRows] = await pool.query<RowDataPacket[]>(
      `SELECT forma_pagamento, COALESCE(SUM(valor), 0) as total 
       FROM parcelas_faturamento 
       WHERE status = "Pago" 
       GROUP BY forma_pagamento`
    );

    // 7. Faturamento mensal (últimos 6 meses)
    const [mensalRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
          DATE_FORMAT(data_pagamento, '%Y-%m') as mes, 
          COALESCE(SUM(valor), 0) as total 
       FROM parcelas_faturamento 
       WHERE status = "Pago" AND data_pagamento IS NOT NULL
       GROUP BY mes 
       ORDER BY mes DESC 
       LIMIT 6`
    );

    // 8. Últimas 5 OS criadas
    const [ultimasOsRows] = await pool.query<RowDataPacket[]>(
      `SELECT os.*, c.nome as cliente_nome, v.modelo as veiculo_modelo 
       FROM ordens_servico os
       JOIN clientes c ON os.cliente_id = c.id
       JOIN veiculos v ON os.veiculo_id = v.id
       ORDER BY os.data_abertura DESC
       LIMIT 5`
    );

    return {
      receita_total: Number(receitaTotal),
      os_ativas: Number(osAtivas),
      estoque_critico: Number(estoqueCritico),
      orcamentos_pendentes: Number(orcamentosPendentes),
      pecas_criticas: pecasRows,
      formas_pagamento: pagtoRows,
      faturamento_mensal: mensalRows.reverse(),
      ultimas_os: ultimasOsRows
    };
  }

  async getDesempenhoOficina(dataInicio: string, dataFim: string): Promise<any> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         COUNT(*) as total_os,
         SUM(CASE WHEN status = 'Concluído' THEN 1 ELSE 0 END) as os_concluidas,
         SUM(CASE WHEN status = 'Cancelado' THEN 1 ELSE 0 END) as os_canceladas,
         SUM(valor_mao_obra) as total_mao_obra,
         SUM(valor_total) as total_geral
       FROM ordens_servico 
       WHERE data_abertura BETWEEN ? AND ?`,
      [dataInicio, dataFim]
    );
    return rows[0];
  }
}
