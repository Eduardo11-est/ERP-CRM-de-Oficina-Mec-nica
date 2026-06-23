import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Cliente {
  id?: number;
  nome: string;
  documento: string;
  email?: string | null;
  telefone: string;
  endereco?: string | null;
  data_cadastro?: string;
}

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

export interface Peca {
  id?: number;
  codigo: string;
  descricao: string;
  valor_compra: number;
  valor_venda: number;
  quantidade_estoque: number;
  quantidade_minima: number;
}

export interface ServicoCatalog {
  id?: number;
  descricao: string;
  valor_mao_obra: number;
}

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
  data_abertura?: string;
  data_conclusao?: string | null;
  valor_mao_obra: number;
  valor_total: number;
  observacoes?: string | null;
  cliente_nome?: string;
  veiculo_placa?: string;
  veiculo_modelo?: string;
  pecas?: OsItemPeca[];
  servicos?: OsItemServico[];
}

export interface ParcelaFaturamento {
  id?: number;
  faturamento_id?: number;
  numero_parcela: number;
  valor: number;
  forma_pagamento: 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Pix' | 'Boleto';
  status: 'Pendente' | 'Pago' | 'Vencido';
  data_vencimento: string;
  data_pagamento?: string | null;
}

export interface Faturamento {
  id?: number;
  ordem_servico_id: number;
  valor_total: number;
  status: 'Pendente' | 'Pago' | 'Parcialmente Pago' | 'Cancelado';
  data_faturamento?: string;
  parcelas?: ParcelaFaturamento[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api';

  // --- CLIENTES ---
  getClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.baseUrl}/clientes`);
  }
  getCliente(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.baseUrl}/clientes/${id}`);
  }
  createCliente(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.baseUrl}/clientes`, cliente);
  }
  updateCliente(id: number, cliente: Partial<Cliente>): Observable<any> {
    return this.http.put(`${this.baseUrl}/clientes/${id}`, cliente);
  }
  deleteCliente(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/clientes/${id}`);
  }

  // --- VEÍCULOS ---
  getVeiculos(): Observable<Veiculo[]> {
    return this.http.get<Veiculo[]>(`${this.baseUrl}/veiculos`);
  }
  getVeiculo(id: number): Observable<Veiculo> {
    return this.http.get<Veiculo>(`${this.baseUrl}/veiculos/${id}`);
  }
  getVeiculosByCliente(clienteId: number): Observable<Veiculo[]> {
    return this.http.get<Veiculo[]>(`${this.baseUrl}/veiculos/cliente/${clienteId}`);
  }
  createVeiculo(veiculo: Veiculo): Observable<Veiculo> {
    return this.http.post<Veiculo>(`${this.baseUrl}/veiculos`, veiculo);
  }
  updateVeiculo(id: number, veiculo: Partial<Veiculo>): Observable<any> {
    return this.http.put(`${this.baseUrl}/veiculos/${id}`, veiculo);
  }
  deleteVeiculo(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/veiculos/${id}`);
  }

  // --- PEÇAS ---
  getPecas(): Observable<Peca[]> {
    return this.http.get<Peca[]>(`${this.baseUrl}/pecas`);
  }
  getPeca(id: number): Observable<Peca> {
    return this.http.get<Peca>(`${this.baseUrl}/pecas/${id}`);
  }
  createPeca(peca: Peca): Observable<Peca> {
    return this.http.post<Peca>(`${this.baseUrl}/pecas`, peca);
  }
  updatePeca(id: number, peca: Partial<Peca>): Observable<any> {
    return this.http.put(`${this.baseUrl}/pecas/${id}`, peca);
  }
  deletePeca(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/pecas/${id}`);
  }

  // --- SERVIÇOS ---
  getServicos(): Observable<ServicoCatalog[]> {
    return this.http.get<ServicoCatalog[]>(`${this.baseUrl}/servicos`);
  }
  getServico(id: number): Observable<ServicoCatalog> {
    return this.http.get<ServicoCatalog>(`${this.baseUrl}/servicos/${id}`);
  }
  createServico(servico: ServicoCatalog): Observable<ServicoCatalog> {
    return this.http.post<ServicoCatalog>(`${this.baseUrl}/servicos`, servico);
  }
  updateServico(id: number, servico: Partial<ServicoCatalog>): Observable<any> {
    return this.http.put(`${this.baseUrl}/servicos/${id}`, servico);
  }
  deleteServico(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/servicos/${id}`);
  }

  // --- ORDENS DE SERVIÇO ---
  getOrdensServico(): Observable<OrdemServico[]> {
    return this.http.get<OrdemServico[]>(`${this.baseUrl}/ordens-servico`);
  }
  getOrdemServico(id: number): Observable<OrdemServico> {
    return this.http.get<OrdemServico>(`${this.baseUrl}/ordens-servico/${id}`);
  }
  createOrdemServico(os: OrdemServico): Observable<OrdemServico> {
    return this.http.post<OrdemServico>(`${this.baseUrl}/ordens-servico`, os);
  }
  updateOrdemServico(id: number, os: Partial<OrdemServico>): Observable<any> {
    return this.http.put(`${this.baseUrl}/ordens-servico/${id}`, os);
  }
  deleteOrdemServico(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/ordens-servico/${id}`);
  }

  // --- FATURAMENTO ---
  getFaturamentos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/faturamentos`);
  }
  getFaturamentoByOs(osId: number): Observable<Faturamento> {
    return this.http.get<Faturamento>(`${this.baseUrl}/faturamentos/os/${osId}`);
  }
  createFaturamento(faturamento: Faturamento): Observable<Faturamento> {
    return this.http.post<Faturamento>(`${this.baseUrl}/faturamentos`, faturamento);
  }
  payParcela(parcelaId: number, paymentData: { data_pagamento?: string; forma_pagamento?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/faturamentos/parcela/${parcelaId}/pagar`, paymentData);
  }

  // --- RELATÓRIOS ---
  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/relatorios/dashboard`);
  }
  getDesempenhoOficina(inicio?: string, fim?: string): Observable<any> {
    let url = `${this.baseUrl}/relatorios/desempenho`;
    if (inicio && fim) {
      url += `?inicio=${inicio}&fim=${fim}`;
    }
    return this.http.get<any>(url);
  }
}
