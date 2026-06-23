import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Peca {
  id?: number;
  codigo: string;
  descricao: string;
  valor_compra: number;
  valor_venda: number;
  quantidade_estoque: number;
  quantidade_minima: number;
}

export class PecaService {
  async getAll(): Promise<Peca[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM pecas ORDER BY descricao ASC');
    return rows as Peca[];
  }

  async getById(id: number): Promise<Peca | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM pecas WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return rows[0] as Peca;
  }

  async getByCodigo(codigo: string): Promise<Peca | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM pecas WHERE codigo = ?', [codigo]);
    if (rows.length === 0) return null;
    return rows[0] as Peca;
  }

  async create(peca: Peca): Promise<Peca> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO pecas (codigo, descricao, valor_compra, valor_venda, quantidade_estoque, quantidade_minima) VALUES (?, ?, ?, ?, ?, ?)',
      [peca.codigo, peca.descricao, peca.valor_compra, peca.valor_venda, peca.quantidade_estoque, peca.quantidade_minima]
    );
    return { ...peca, id: result.insertId };
  }

  async update(id: number, peca: Partial<Peca>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (peca.codigo !== undefined) { fields.push('codigo = ?'); values.push(peca.codigo); }
    if (peca.descricao !== undefined) { fields.push('descricao = ?'); values.push(peca.descricao); }
    if (peca.valor_compra !== undefined) { fields.push('valor_compra = ?'); values.push(peca.valor_compra); }
    if (peca.valor_venda !== undefined) { fields.push('valor_venda = ?'); values.push(peca.valor_venda); }
    if (peca.quantidade_estoque !== undefined) { fields.push('quantidade_estoque = ?'); values.push(peca.quantidade_estoque); }
    if (peca.quantidade_minima !== undefined) { fields.push('quantidade_minima = ?'); values.push(peca.quantidade_minima); }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE pecas SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  async adjustStock(id: number, diff: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE pecas SET quantidade_estoque = quantidade_estoque + ? WHERE id = ?',
      [diff, id]
    );
    return result.affectedRows > 0;
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM pecas WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}
