-- Criar banco de dados se não existir
CREATE DATABASE IF NOT EXISTS erpcrm_mecanica CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE erpcrm_mecanica;

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    documento VARCHAR(20) UNIQUE NOT NULL, -- CPF ou CNPJ
    email VARCHAR(100),
    telefone VARCHAR(20) NOT NULL,
    endereco VARCHAR(255),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabela de Veículos
CREATE TABLE IF NOT EXISTS veiculos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    ano INT NOT NULL,
    placa VARCHAR(10) UNIQUE NOT NULL,
    chassi VARCHAR(30),
    quilometragem INT DEFAULT 0,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabela de Peças (Estoque)
CREATE TABLE IF NOT EXISTS pecas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    descricao VARCHAR(150) NOT NULL,
    valor_compra DECIMAL(10, 2) NOT NULL,
    valor_venda DECIMAL(10, 2) NOT NULL,
    quantidade_estoque INT NOT NULL DEFAULT 0,
    quantidade_minima INT NOT NULL DEFAULT 5
) ENGINE=InnoDB;

-- Tabela de Serviços
CREATE TABLE IF NOT EXISTS servicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(150) NOT NULL,
    valor_mao_obra DECIMAL(10, 2) NOT NULL
) ENGINE=InnoDB;

-- Tabela de Ordens de Serviço (OS)
CREATE TABLE IF NOT EXISTS ordens_servico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    veiculo_id INT NOT NULL,
    status ENUM('Orçamento', 'Aprovado', 'Em Execução', 'Aguardando Peças', 'Concluído', 'Cancelado') NOT NULL DEFAULT 'Orçamento',
    data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_conclusao TIMESTAMP NULL,
    valor_mao_obra DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    valor_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    observacoes TEXT,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Tabela Pivô para Peças vinculadas à OS
CREATE TABLE IF NOT EXISTS itens_os_pecas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ordem_servico_id INT NOT NULL,
    peca_id INT NOT NULL,
    quantidade INT NOT NULL,
    valor_unitario DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (ordem_servico_id) REFERENCES ordens_servico(id) ON DELETE CASCADE,
    FOREIGN KEY (peca_id) REFERENCES pecas(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Tabela Pivô para Serviços vinculados à OS
CREATE TABLE IF NOT EXISTS itens_os_servicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ordem_servico_id INT NOT NULL,
    servico_id INT NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (ordem_servico_id) REFERENCES ordens_servico(id) ON DELETE CASCADE,
    FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Tabela de Faturamento
CREATE TABLE IF NOT EXISTS faturamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ordem_servico_id INT NOT NULL,
    valor_total DECIMAL(10, 2) NOT NULL,
    status ENUM('Pendente', 'Pago', 'Parcialmente Pago', 'Cancelado') NOT NULL DEFAULT 'Pendente',
    data_faturamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ordem_servico_id) REFERENCES ordens_servico(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabela de Parcelas de Faturamento (Suporta parcelamento e formas de pagamento mistas)
CREATE TABLE IF NOT EXISTS parcelas_faturamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    faturamento_id INT NOT NULL,
    numero_parcela INT NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    forma_pagamento ENUM('Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Boleto') NOT NULL,
    status ENUM('Pendente', 'Pago', 'Vencido') NOT NULL DEFAULT 'Pendente',
    data_vencimento DATE NOT NULL,
    data_pagamento TIMESTAMP NULL,
    FOREIGN KEY (faturamento_id) REFERENCES faturamentos(id) ON DELETE CASCADE
) ENGINE=InnoDB;
