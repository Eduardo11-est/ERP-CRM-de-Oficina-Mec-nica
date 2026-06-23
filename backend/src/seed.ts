import pool from './config/database.js';

async function runSeed() {
  console.log('🌱 Iniciando a inserção de dados de demonstração (seed)...');

  try {
    // 1. Inserir Clientes de teste
    console.log('Inserindo clientes...');
    const [clientRes] = await pool.query(
      `INSERT INTO clientes (nome, documento, email, telefone, endereco) VALUES 
       ('João da Silva', '123.456.789-00', 'joao@silva.com', '(11) 98888-7777', 'Rua das Flores, 123 - São Paulo/SP'),
       ('Maria Oliveira Santos', '987.654.321-11', 'maria.santos@gmail.com', '(11) 97777-6666', 'Av. Paulista, 1000 - São Paulo/SP')
       ON DUPLICATE KEY UPDATE nome=VALUES(nome)`
    );

    // Obter IDs dos clientes
    const [clientes] = await pool.query('SELECT id, nome FROM clientes');
    const joaoId = (clientes as any[]).find(c => c.nome.includes('João'))?.id;
    const mariaId = (clientes as any[]).find(c => c.nome.includes('Maria'))?.id;

    if (!joaoId || !mariaId) throw new Error('Falha ao obter os IDs dos clientes.');

    // 2. Inserir Veículos
    console.log('Inserindo veículos...');
    await pool.query(
      `INSERT INTO veiculos (cliente_id, marca, modelo, ano, placa, chassi, quilometragem) VALUES 
       (?, 'Chevrolet', 'Onix 1.0 Turbo', 2021, 'ABC-1234', '9BGXXXXXXXXXXXXXX', 45000),
       (?, 'Toyota', 'Corolla XEi', 2019, 'XYZ-9876', '9BHXXXXXXXXXXXXXX', 78000)
       ON DUPLICATE KEY UPDATE modelo=VALUES(modelo)`,
      [joaoId, mariaId]
    );

    const [veiculos] = await pool.query('SELECT id, placa FROM veiculos');
    const onixId = (veiculos as any[]).find(v => v.placa === 'ABC-1234')?.id;
    const corollaId = (veiculos as any[]).find(v => v.placa === 'XYZ-9876')?.id;

    if (!onixId || !corollaId) throw new Error('Falha ao obter os IDs dos veículos.');

    // 3. Inserir Peças (Estoque)
    console.log('Inserindo peças no estoque...');
    await pool.query(
      `INSERT INTO pecas (codigo, descricao, valor_compra, valor_venda, quantidade_estoque, quantidade_minima) VALUES 
       ('OLEO-5W30', 'Óleo de Motor 5W30 Sintético (1L)', 25.50, 48.00, 40, 10),
       ('FILTRO-OLEO', 'Filtro de Óleo Lubrificante', 12.00, 32.00, 15, 5),
       ('PASTILHA-DIANT', 'Pastilha de Freio Dianteira', 65.00, 120.00, 8, 3),
       ('DISCO-FREIO', 'Disco de Freio Dianteiro (Par)', 110.00, 220.00, 4, 2),
       ('AMORTECEDOR', 'Amortecedor Dianteiro Cofap', 180.00, 340.00, 2, 4) -- Estoque crítico!
       ON DUPLICATE KEY UPDATE descricao=VALUES(descricao)`
    );

    const [pecas] = await pool.query('SELECT id, codigo FROM pecas');
    const oleoId = (pecas as any[]).find(p => p.codigo === 'OLEO-5W30')?.id;
    const filtroId = (pecas as any[]).find(p => p.codigo === 'FILTRO-OLEO')?.id;
    const pastilhaId = (pecas as any[]).find(p => p.codigo === 'PASTILHA-DIANT')?.id;

    // 4. Inserir Serviços Catalogo
    console.log('Inserindo serviços de catálogo...');
    await pool.query(
      `INSERT INTO servicos (descricao, valor_mao_obra) VALUES 
       ('Troca de Óleo e Filtros', 50.00),
       ('Substituição de Pastilhas de Freio', 80.00),
       ('Revisão Preventiva Completa', 250.00),
       ('Alinhamento e Balanceamento 3D', 120.00)
       ON DUPLICATE KEY UPDATE descricao=VALUES(descricao)`
    );

    const [servicos] = await pool.query('SELECT id, descricao FROM servicos');
    const trocaOleoServId = (servicos as any[]).find(s => s.descricao.includes('Troca de Óleo'))?.id;
    const freioServId = (servicos as any[]).find(s => s.descricao.includes('Substituição de Pastilhas'))?.id;

    // 5. Inserir uma Ordem de Serviço de Exemplo 1: Orçamento pendente
    console.log('Criando OS de orçamento pendente...');
    const [os1Res] = await pool.query(
      `INSERT INTO ordens_servico (cliente_id, veiculo_id, status, valor_mao_obra, valor_total, observacoes) 
       VALUES (?, ?, 'Orçamento', 50.00, 178.00, 'Cliente relata barulho metálico leve ao frear.')`,
      [joaoId, onixId]
    );
    const os1Id = (os1Res as any).insertId;
    
    // Adicionar itens à OS 1 (Sem mexer no estoque ainda pois é Orçamento)
    if (trocaOleoServId && oleoId && filtroId) {
      await pool.query(
        `INSERT INTO itens_os_servicos (ordem_servico_id, servico_id, quantidade, valor_unitario) 
         VALUES (?, ?, 1, 50.00)`,
        [os1Id, trocaOleoServId]
      );
      await pool.query(
        `INSERT INTO itens_os_pecas (ordem_servico_id, peca_id, quantidade, valor_unitario) 
         VALUES (?, ?, 2, 48.00), (?, ?, 1, 32.00)`,
        [os1Id, oleoId, os1Id, filtroId]
      );
    }

    // 6. Inserir uma OS de Exemplo 2: Concluída e Faturada
    console.log('Criando OS concluída e faturada...');
    const [os2Res] = await pool.query(
      `INSERT INTO ordens_servico (cliente_id, veiculo_id, status, valor_mao_obra, valor_total, observacoes, data_conclusao) 
       VALUES (?, ?, 'Concluído', 80.00, 200.00, 'Substituição das pastilhas de freio dianteiras.', CURRENT_TIMESTAMP)`,
      [mariaId, corollaId]
    );
    const os2Id = (os2Res as any).insertId;

    if (freioServId && pastilhaId) {
      await pool.query(
        `INSERT INTO itens_os_servicos (ordem_servico_id, servico_id, quantidade, valor_unitario) 
         VALUES (?, ?, 1, 80.00)`,
        [os2Id, freioServId]
      );
      await pool.query(
        `INSERT INTO itens_os_pecas (ordem_servico_id, peca_id, quantidade, valor_unitario) 
         VALUES (?, ?, 1, 120.00)`,
        [os2Id, pastilhaId]
      );
      
      // Como já está Concluída, reduz estoque da pastilha
      await pool.query(
        'UPDATE pecas SET quantidade_estoque = quantidade_estoque - 1 WHERE id = ?',
        [pastilhaId]
      );
    }

    // Criar Faturamento para OS 2 (Valor total R$ 200,00 parcelado em 2x - 1a paga em Pix e 2a pendente no Cartão)
    console.log('Inserindo faturamento parcelado...');
    const [fatRes] = await pool.query(
      `INSERT INTO faturamentos (ordem_servico_id, valor_total, status) 
       VALUES (?, 200.00, 'Parcialmente Pago')`,
      [os2Id]
    );
    const fatId = (fatRes as any).insertId;

    await pool.query(
      `INSERT INTO parcelas_faturamento (faturamento_id, numero_parcela, valor, forma_pagamento, status, data_vencimento, data_pagamento) VALUES 
       (?, 1, 100.00, 'Pix', 'Pago', CURDATE(), CURRENT_TIMESTAMP),
       (?, 2, 100.00, 'Cartão de Crédito', 'Pendente', DATE_ADD(CURDATE(), INTERVAL 30 DAY), NULL)`,
      [fatId, fatId]
    );

    console.log('🎉 Seed concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante o seed do banco de dados:', error);
  } finally {
    await pool.end();
  }
}

runSeed();
