import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';

import { ClienteService } from '../services/cliente.service.js';
import { VeiculoService } from '../services/veiculo.service.js';
import { PecaService } from '../services/peca.service.js';
import { ServicoService } from '../services/servico.service.js';
import { OrdemServicoService } from '../services/ordemservico.service.js';
import { FaturamentoService } from '../services/faturamento.service.js';
import { RelatorioService } from '../services/relatorio.service.js';

const clienteService = new ClienteService();
const veiculoService = new VeiculoService();
const pecaService = new PecaService();
const servicoService = new ServicoService();
const osService = new OrdemServicoService();
const faturamentoService = new FaturamentoService();
const relatorioService = new RelatorioService();

export async function apiRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // --- CLIENTES ---
  fastify.get('/clientes', async (request, reply) => {
    const clientes = await clienteService.getAll();
    return clientes;
  });

  fastify.get('/clientes/:id', async (request: any, reply) => {
    const id = Number(request.params.id);
    const cliente = await clienteService.getById(id);
    if (!cliente) return reply.status(404).send({ message: 'Cliente não encontrado' });
    return cliente;
  });

  fastify.post('/clientes', async (request, reply) => {
    const schema = z.object({
      nome: z.string().min(2, 'Nome é obrigatório'),
      documento: z.string().min(11, 'Documento inválido'),
      email: z.string().email('E-mail inválido').optional().nullable(),
      telefone: z.string().min(8, 'Telefone é obrigatório'),
      endereco: z.string().optional().nullable(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.format() });
    }

    const exisiting = await clienteService.getByDocumento(parsed.data.documento);
    if (exisiting) {
      return reply.status(409).send({ message: 'Documento já cadastrado' });
    }

    const created = await clienteService.create(parsed.data);
    return reply.status(201).send(created);
  });

  fastify.put('/clientes/:id', async (request: any, reply) => {
    const id = Number(request.params.id);
    const schema = z.object({
      nome: z.string().min(2).optional(),
      documento: z.string().min(11).optional(),
      email: z.string().email().optional().nullable(),
      telefone: z.string().min(8).optional(),
      endereco: z.string().optional().nullable(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.format() });
    }

    const updated = await clienteService.update(id, parsed.data);
    if (!updated) return reply.status(404).send({ message: 'Cliente não encontrado' });
    return { success: true };
  });

  fastify.delete('/clientes/:id', async (request: any, reply) => {
    const id = Number(request.params.id);
    try {
      const deleted = await clienteService.delete(id);
      if (!deleted) return reply.status(404).send({ message: 'Cliente não encontrado' });
      return { success: true };
    } catch (e: any) {
      if (e.code === 'ER_ROW_IS_REFERENCED_2') {
        return reply.status(409).send({ message: 'Não é possível excluir o cliente pois ele possui veículos ou OS vinculadas.' });
      }
      throw e;
    }
  });

  // --- VEÍCULOS ---
  fastify.get('/veiculos', async (request, reply) => {
    const veiculos = await veiculoService.getAll();
    return veiculos;
  });

  fastify.get('/veiculos/:id', async (request: any, reply) => {
    const id = Number(request.params.id);
    const veiculo = await veiculoService.getById(id);
    if (!veiculo) return reply.status(404).send({ message: 'Veículo não encontrado' });
    return veiculo;
  });

  fastify.get('/veiculos/cliente/:clienteId', async (request: any, reply) => {
    const clienteId = Number(request.params.clienteId);
    const veiculos = await veiculoService.getByClienteId(clienteId);
    return veiculos;
  });

  fastify.post('/veiculos', async (request, reply) => {
    const schema = z.object({
      cliente_id: z.number({ required_error: 'Cliente é obrigatório' }),
      marca: z.string().min(1, 'Marca é obrigatória'),
      modelo: z.string().min(1, 'Modelo é obrigatório'),
      ano: z.number().int().min(1900),
      placa: z.string().min(7, 'Placa inválida'),
      chassi: z.string().optional().nullable(),
      quilometragem: z.number().int().default(0),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.format() });
    }

    const existing = await veiculoService.getByPlaca(parsed.data.placa);
    if (existing) {
      return reply.status(409).send({ message: 'Placa de veículo já cadastrada' });
    }

    const created = await veiculoService.create(parsed.data);
    return reply.status(201).send(created);
  });

  fastify.put('/veiculos/:id', async (request: any, reply) => {
    const id = Number(request.params.id);
    const schema = z.object({
      cliente_id: z.number().optional(),
      marca: z.string().optional(),
      modelo: z.string().optional(),
      ano: z.number().optional(),
      placa: z.string().optional(),
      chassi: z.string().optional().nullable(),
      quilometragem: z.number().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.format() });
    }

    const updated = await veiculoService.update(id, parsed.data);
    if (!updated) return reply.status(404).send({ message: 'Veículo não encontrado' });
    return { success: true };
  });

  fastify.delete('/veiculos/:id', async (request: any, reply) => {
    const id = Number(request.params.id);
    try {
      const deleted = await veiculoService.delete(id);
      if (!deleted) return reply.status(404).send({ message: 'Veículo não encontrado' });
      return { success: true };
    } catch (e: any) {
      if (e.code === 'ER_ROW_IS_REFERENCED_2') {
        return reply.status(409).send({ message: 'Não é possível excluir o veículo pois ele possui ordens de serviço vinculadas.' });
      }
      throw e;
    }
  });

  // --- PEÇAS ---
  fastify.get('/pecas', async (request, reply) => {
    const pecas = await pecaService.getAll();
    return pecas;
  });

  fastify.get('/pecas/:id', async (request: any, reply) => {
    const id = Number(request.params.id);
    const peca = await pecaService.getById(id);
    if (!peca) return reply.status(404).send({ message: 'Peça não encontrada' });
    return peca;
  });

  fastify.post('/pecas', async (request, reply) => {
    const schema = z.object({
      codigo: z.string().min(1, 'Código é obrigatório'),
      descricao: z.string().min(1, 'Descrição é obrigatória'),
      valor_compra: z.number().positive(),
      valor_venda: z.number().positive(),
      quantidade_estoque: z.number().int().default(0),
      quantidade_minima: z.number().int().default(5),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.format() });
    }

    const existing = await pecaService.getByCodigo(parsed.data.codigo);
    if (existing) {
      return reply.status(409).send({ message: 'Código de peça já cadastrado' });
    }

    const created = await pecaService.create(parsed.data);
    return reply.status(201).send(created);
  });

  fastify.put('/pecas/:id', async (request: any, reply) => {
    const id = Number(request.params.id);
    const schema = z.object({
      codigo: z.string().optional(),
      descricao: z.string().optional(),
      valor_compra: z.number().optional(),
      valor_venda: z.number().optional(),
      quantidade_estoque: z.number().optional(),
      quantidade_minima: z.number().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.format() });
    }

    const updated = await pecaService.update(id, parsed.data);
    if (!updated) return reply.status(404).send({ message: 'Peça não encontrada' });
    return { success: true };
  });

  fastify.delete('/pecas/:id', async (request: any, reply) => {
    const id = Number(request.params.id);
    try {
      const deleted = await pecaService.delete(id);
      if (!deleted) return reply.status(404).send({ message: 'Peça não encontrada' });
      return { success: true };
    } catch (e: any) {
      if (e.code === 'ER_ROW_IS_REFERENCED_2') {
        return reply.status(409).send({ message: 'Não é possível excluir a peça pois está vinculada a ordens de serviço.' });
      }
      throw e;
    }
  });

  // --- SERVIÇOS ---
  fastify.get('/servicos', async (request, reply) => {
    const servicos = await servicoService.getAll();
    return servicos;
  });

  fastify.get('/servicos/:id', async (request: any, reply) => {
    const id = Number(request.params.id);
    const servico = await servicoService.getById(id);
    if (!servico) return reply.status(404).send({ message: 'Serviço não encontrado' });
    return servico;
  });

  fastify.post('/servicos', async (request, reply) => {
    const schema = z.object({
      descricao: z.string().min(1, 'Descrição é obrigatória'),
      valor_mao_obra: z.number().positive(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.format() });
    }

    const created = await servicoService.create(parsed.data);
    return reply.status(201).send(created);
  });

  fastify.put('/servicos/:id', async (request: any, reply) => {
    const id = Number(request.params.id);
    const schema = z.object({
      descricao: z.string().optional(),
      valor_mao_obra: z.number().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.format() });
    }

    const updated = await servicoService.update(id, parsed.data);
    if (!updated) return reply.status(404).send({ message: 'Serviço não encontrado' });
    return { success: true };
  });

  fastify.delete('/servicos/:id', async (request: any, reply) => {
    const id = Number(request.params.id);
    try {
      const deleted = await servicoService.delete(id);
      if (!deleted) return reply.status(404).send({ message: 'Serviço não encontrado' });
      return { success: true };
    } catch (e: any) {
      if (e.code === 'ER_ROW_IS_REFERENCED_2') {
        return reply.status(409).send({ message: 'Não é possível excluir o serviço pois está vinculado a ordens de serviço.' });
      }
      throw e;
    }
  });

  // --- ORDENS DE SERVIÇO (OS) ---
  fastify.get('/ordens-servico', async (request, reply) => {
    const ordens = await osService.getAll();
    return ordens;
  });

  fastify.get('/ordens-servico/:id', async (request: any, reply) => {
    const id = Number(request.params.id);
    const os = await osService.getById(id);
    if (!os) return reply.status(404).send({ message: 'Ordem de Serviço não encontrada' });
    return os;
  });

  fastify.post('/ordens-servico', async (request, reply) => {
    const schema = z.object({
      cliente_id: z.number({ required_error: 'Cliente é obrigatório' }),
      veiculo_id: z.number({ required_error: 'Veículo é obrigatório' }),
      status: z.enum(['Orçamento', 'Aprovado', 'Em Execução', 'Aguardando Peças', 'Concluído', 'Cancelado']).default('Orçamento'),
      valor_mao_obra: z.number().default(0),
      valor_total: z.number().default(0),
      observacoes: z.string().optional().nullable(),
      pecas: z.array(
        z.object({
          peca_id: z.number(),
          quantidade: z.number().int().positive(),
          valor_unitario: z.number(),
        })
      ).optional(),
      servicos: z.array(
        z.object({
          servico_id: z.number(),
          quantidade: z.number().int().default(1),
          valor_unitario: z.number(),
        })
      ).optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.format() });
    }

    try {
      const created = await osService.create(parsed.data as any);
      return reply.status(201).send(created);
    } catch (e: any) {
      return reply.status(500).send({ message: e.message });
    }
  });

  fastify.put('/ordens-servico/:id', async (request: any, reply) => {
    const id = Number(request.params.id);
    const schema = z.object({
      cliente_id: z.number().optional(),
      veiculo_id: z.number().optional(),
      status: z.enum(['Orçamento', 'Aprovado', 'Em Execução', 'Aguardando Peças', 'Concluído', 'Cancelado']).optional(),
      valor_mao_obra: z.number().optional(),
      valor_total: z.number().optional(),
      observacoes: z.string().optional().nullable(),
      pecas: z.array(
        z.object({
          peca_id: z.number(),
          quantidade: z.number().int().positive(),
          valor_unitario: z.number(),
        })
      ).optional(),
      servicos: z.array(
        z.object({
          servico_id: z.number(),
          quantidade: z.number().int().default(1),
          valor_unitario: z.number(),
        })
      ).optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.format() });
    }

    try {
      const updated = await osService.update(id, parsed.data as any);
      if (!updated) return reply.status(404).send({ message: 'Ordem de serviço não encontrada' });
      return { success: true };
    } catch (e: any) {
      return reply.status(500).send({ message: e.message });
    }
  });

  fastify.delete('/ordens-servico/:id', async (request: any, reply) => {
    const id = Number(request.params.id);
    const deleted = await osService.delete(id);
    if (!deleted) return reply.status(404).send({ message: 'Ordem de serviço não encontrada' });
    return { success: true };
  });

  // --- FATURAMENTO ---
  fastify.get('/faturamentos', async (request, reply) => {
    const list = await faturamentoService.getFaturamentoDetails();
    return list;
  });

  fastify.get('/faturamentos/os/:osId', async (request: any, reply) => {
    const osId = Number(request.params.osId);
    const faturamento = await faturamentoService.getByOsId(osId);
    if (!faturamento) return reply.status(404).send({ message: 'Faturamento não encontrado para esta OS' });
    return faturamento;
  });

  fastify.post('/faturamentos', async (request, reply) => {
    const schema = z.object({
      ordem_servico_id: z.number(),
      valor_total: z.number(),
      status: z.enum(['Pendente', 'Pago', 'Parcialmente Pago', 'Cancelado']).default('Pendente'),
      parcelas: z.array(
        z.object({
          numero_parcela: z.number().int(),
          valor: z.number(),
          forma_pagamento: z.enum(['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Boleto']),
          status: z.enum(['Pendente', 'Pago', 'Vencido']).default('Pendente'),
          data_vencimento: z.string(),
          data_pagamento: z.string().optional().nullable(),
        })
      ).optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.format() });
    }

    try {
      const created = await faturamentoService.create(parsed.data as any);
      return reply.status(201).send(created);
    } catch (e: any) {
      return reply.status(500).send({ message: e.message });
    }
  });

  fastify.post('/faturamentos/parcela/:id/pagar', async (request: any, reply) => {
    const id = Number(request.params.id);
    const schema = z.object({
      data_pagamento: z.string().default(() => new Date().toISOString().slice(0, 19).replace('T', ' ')),
      forma_pagamento: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.format() });
    }

    const success = await faturamentoService.payParcela(id, parsed.data.data_pagamento, parsed.data.forma_pagamento);
    if (!success) return reply.status(404).send({ message: 'Parcela não encontrada' });
    return { success: true };
  });

  // --- RELATÓRIOS & DASHBOARD ---
  fastify.get('/relatorios/dashboard', async (request, reply) => {
    const stats = await relatorioService.getDashboardStats();
    return stats;
  });

  fastify.get('/relatorios/desempenho', async (request: any, reply) => {
    const schema = z.object({
      inicio: z.string().default(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
      fim: z.string().default(() => new Date().toISOString().slice(0, 10)),
    });

    const parsed = schema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ errors: parsed.error.format() });
    }

    const result = await relatorioService.getDesempenhoOficina(parsed.data.inicio, parsed.data.fim);
    return result;
  });
}
