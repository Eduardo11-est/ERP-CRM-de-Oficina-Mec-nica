# ⚙️ OficinaPRO - ERP/CRM para Oficinas Mecânicas

O **OficinaPRO** é um sistema completo e moderno de ERP e CRM desenvolvido especificamente para gerenciar oficinas mecânicas de forma ágil e eficiente. Com um design B2B premium e foco em usabilidade, o sistema atende tanto às necessidades administrativas do escritório quanto ao uso rápido por mecânicos diretamente no pátio através de celulares e tablets.

---

## 🚀 Funcionalidades Principais

*   **📊 Dashboard & Painel Financeiro**: 
    *   Exibição de KPIs operacionais (receita total, ordens em andamento, orçamentos pendentes, estoque crítico).
    *   Gráficos dinâmicos nativos em SVG para faturamento dos últimos 6 meses.
    *   Listagem rápida das últimas OS criadas e alerta de peças abaixo da quantidade mínima.
*   **👥 Gestão de Clientes & Veículos**:
    *   Interface B2B *split-screen* com pesquisa instantânea.
    *   Visualização integrada de dados cadastrais e veículos associados por cliente.
    *   Cadastro ágil de novos veículos vinculados à ficha do proprietário.
*   **🚗 Consulta de Frota**:
    *   Grade de consulta rápida de todos os veículos cadastrados por placa, modelo ou proprietário.
*   **📦 Estoque Inteligente de Peças**:
    *   Controle de preço de compra (custo) e venda.
    *   **Cálculo automático de margem (Markup)** por peça.
    *   Indicadores visuais de estoque baixo com alertas piscantes em vermelho.
*   **📋 Ordens de Serviço (OS) & Orçamentos**:
    *   Geração e edição de orçamentos vinculando múltiplos serviços e peças.
    *   **Controle automático de estoque**: Ao aprovar a OS ("Aprovado" ou "Em Execução"), o estoque das peças é reduzido; ao cancelar a OS ("Cancelado"), as peças são estornadas automaticamente ao estoque.
*   **💳 Faturamento Parcelado & Misto**:
    *   Módulo financeiro que permite faturar OS em múltiplas parcelas.
    *   **Suporte a pagamentos mistos**: Seleção de formas de pagamento independentes por parcela (Pix, Dinheiro, Cartão de Crédito, Cartão de Débito, Boleto).
    *   Fluxo de quitação individual de parcelas para controle do contas a receber.

---

## 🛠️ Stack Tecnológica

### Frontend
*   **Angular 18+** (Standalone Components, Signals para estado reativo ultra-rápido, Router, SCSS).
*   **Material Symbols Outlined** para ícones.
*   **Estética Industrial Premium**: Tema escuro focado em alto contraste e cores semânticas bem planejadas (tons de carvão/cinza chumbo e detalhes em laranja vibrante/azul mecânico).

### Backend
*   **Node.js + Fastify** (TypeScript compilado estritamente, ESM, Zod para validação rápida de payloads e tratamento centralizado de erros).
*   **mysql2/promise** para execução direta de consultas SQL parametrizadas brutas, garantindo o máximo de performance e segurança contra injeções SQL.

### Banco de Dados
*   **MySQL** (Tabelas normalizadas, integridade referencial, e suporte transacional seguro).

---

## 📁 Estrutura do Projeto

```
ERPCRM - Mecanica/
├── backend/            # API REST em Node.js (Fastify + TypeScript)
│   ├── src/
│   │   ├── config/     # Pool de conexão MySQL e seeds
│   │   ├── routes/     # Rotas HTTP e esquemas Zod
│   │   ├── services/   # Lógica de negócio e queries SQL parametrizadas
│   │   └── server.ts   # Ponto de entrada do Fastify
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
├── frontend/           # Aplicação Single Page em Angular 18
│   ├── src/
│   │   ├── app/
│   │   │   ├── pages/  # Dashboard, Clientes, Veículos, Estoque, OS
│   │   │   ├── services/# Consumo das rotas HTTP
│   │   │   ├── app.ts  # Componente Shell Principal
│   │   │   └── app.html
│   │   └── styles.scss # Sistema de Design centralizado
│   ├── angular.json
│   └── package.json
├── database/           # Scripts SQL do banco de dados
│   └── schema.sql      # Estrutura das tabelas
├── .gitignore          # Filtro de commits
└── README.md           # Documentação do projeto
```

---

## ⚙️ Como Executar o Projeto

### 1. Requisitos Prévios
*   Node.js (versão 20 ou superior recomendado)
*   MySQL Server ativo localmente

### 2. Configurando o Banco de Dados MySQL
Importe o arquivo do esquema inicial para criar o banco de dados e as tabelas:
```bash
mysql -u seu_usuario -p < database/schema.sql
```

### 3. Configurando e Executando o Backend
1.  Navegue até a pasta `backend`:
    ```bash
    cd backend
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Crie um arquivo `.env` com base no arquivo `.env.example` e preencha as credenciais do seu MySQL local:
    ```env
    PORT=3000
    DB_HOST=localhost
    DB_USER=seu_usuario
    DB_PASSWORD=sua_senha
    DB_NAME=erpcrm_mecanica
    DB_PORT=3306
    ```
4.  Execute o script de semente (seed) para popular o banco de dados com dados de teste:
    ```bash
    npm run seed
    ```
5.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
    O backend estará rodando em: `http://localhost:3000`.

### 4. Configurando e Executando o Frontend
1.  Navegue até a pasta `frontend`:
    ```bash
    cd ../frontend
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Inicie o servidor de desenvolvimento do Angular:
    ```bash
    npm start
    ```
    Acesse a aplicação no navegador através de: `http://localhost:4200`.

---

## 📝 Licença
Este projeto é de uso livre para estudos e desenvolvimento comercial sob a licença de preferência do proprietário da oficina.
