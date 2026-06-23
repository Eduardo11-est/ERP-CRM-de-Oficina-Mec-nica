import pool from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Veiculo {
  id?: number;
  cliente_id: number;
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
  chassi?: string | null;
  quilometragem: number;
  cliente_nome?: string;
}

export class VeiculoService {
  async getAll(): Promise<Veiculo[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT v.*, c.nome as cliente_nome 
       FROM veiculos v 
       JOIN clientes c ON v.cliente_id = c.id 
       ORDER BY v.modelo ASC`
    );
    return rows as Veiculo[];
  }

  async getById(id: number): Promise<Veiculo | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT v.*, c.nome as cliente_nome 
       FROM veiculos v 
       JOIN clientes c ON v.cliente_id = c.id 
       WHERE v.id = ?`,
      [id]
    );
    if (rows.length === 0) return null;
    return rows[0] as Veiculo;
  }

  async getByPlaca(placa: string): Promise<Veiculo | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM veiculos WHERE placa = ?',
      [placa.toUpperCase()]
    );
    if (rows.length === 0) return null;
    return rows[0] as Veiculo;
  }

  async getByClienteId(clienteId: number): Promise<Veiculo[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM veiculos WHERE cliente_id = ?', [clienteId]);
    return rows as Veiculo[];
  }

  async create(veiculo: Veiculo): Promise<Veiculo> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO veiculos (cliente_id, marca, modelo, ano, placa, chassi, quilometragem) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        veiculo.cliente_id,
        veiculo.marca,
        veiculo.modelo,
        veiculo.ano,
        veiculo.placa.toUpperCase(),
        veiculo.chassi || null,
        veiculo.quilometragem || 0
      ]
    );
    return { ...veiculo, id: result.insertId };
  }

  async update(id: number, veiculo: Partial<Veiculo>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (veiculo.cliente_id !== undefined) { fields.push('cliente_id = ?'); values.push(veiculo.cliente_id); }
    if (veiculo.marca !== undefined) { fields.push('marca = ?'); values.push(veiculo.marca); }
    if (veiculo.modelo !== undefined) { fields.push('modelo = ?'); values.push(veiculo.modelo); }
    if (veiculo.ano !== undefined) { fields.push('ano = ?'); values.push(veiculo.ano); }
    if (veiculo.placa !== undefined) { fields.push('placa = ?'); values.push(veiculo.placa.toUpperCase()); }
    if (veiculo.chassi !== undefined) { fields.push('chassi = ?'); values.push(veiculo.chassi || null); }
    if (veiculo.quilometragem !== undefined) { fields.push('quilometragem = ?'); values.push(veiculo.quilometragem); }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE veiculos SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM veiculos WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}
