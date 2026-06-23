import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Cliente {
  id?: number;
  nome: string;
  documento: string;
  email?: string | null;
  telefone: string;
  endereco?: string | null;
  data_cadastro?: Date;
}

export class ClienteService {
  async getAll(): Promise<Cliente[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM clientes ORDER BY nome ASC');
    return rows as Cliente[];
  }

  async getById(id: number): Promise<Cliente | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM clientes WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return rows[0] as Cliente;
  }

  async getByDocumento(documento: string): Promise<Cliente | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM clientes WHERE documento = ?', [documento]);
    if (rows.length === 0) return null;
    return rows[0] as Cliente;
  }

  async create(cliente: Cliente): Promise<Cliente> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO clientes (nome, documento, email, telefone, endereco) VALUES (?, ?, ?, ?, ?)',
      [cliente.nome, cliente.documento, cliente.email || null, cliente.telefone, cliente.endereco || null]
    );
    return { ...cliente, id: result.insertId };
  }

  async update(id: number, cliente: Partial<Cliente>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (cliente.nome !== undefined) { fields.push('nome = ?'); values.push(cliente.nome); }
    if (cliente.documento !== undefined) { fields.push('documento = ?'); values.push(cliente.documento); }
    if (cliente.email !== undefined) { fields.push('email = ?'); values.push(cliente.email || null); }
    if (cliente.telefone !== undefined) { fields.push('telefone = ?'); values.push(cliente.telefone); }
    if (cliente.endereco !== undefined) { fields.push('endereco = ?'); values.push(cliente.endereco || null); }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE clientes SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM clientes WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}
