import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface ServicoCatalog {
  id?: number;
  descricao: string;
  valor_mao_obra: number;
}

export class ServicoService {
  async getAll(): Promise<ServicoCatalog[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM servicos ORDER BY descricao ASC');
    return rows as ServicoCatalog[];
  }

  async getById(id: number): Promise<ServicoCatalog | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM servicos WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return rows[0] as ServicoCatalog;
  }

  async create(servico: ServicoCatalog): Promise<ServicoCatalog> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO servicos (descricao, valor_mao_obra) VALUES (?, ?)',
      [servico.descricao, servico.valor_mao_obra]
    );
    return { ...servico, id: result.insertId };
  }

  async update(id: number, servico: Partial<ServicoCatalog>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (servico.descricao !== undefined) { fields.push('descricao = ?'); values.push(servico.descricao); }
    if (servico.valor_mao_obra !== undefined) { fields.push('valor_mao_obra = ?'); values.push(servico.valor_mao_obra); }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE servicos SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM servicos WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}
