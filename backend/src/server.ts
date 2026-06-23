import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import dotenv from 'dotenv';
import { apiRoutes } from './routes/api.routes.js';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

// Registrar Helmet para cabeçalhos de segurança
await fastify.register(helmet, { contentSecurityPolicy: false });

// Registrar CORS para permitir requisições do frontend Angular
await fastify.register(cors, {
  origin: '*', // Em produção, mude para a URL do frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

// Registrar rotas da API com prefixo '/api'
await fastify.register(apiRoutes, { prefix: '/api' });

// Handler centralizado de erros
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  if (error.validation) {
    return reply.status(400).send({
      message: 'Erro de validação nos dados enviados',
      errors: error.validation,
    });
  }

  // Erro interno do servidor (não expõe detalhes sensíveis ao cliente)
  return reply.status(error.statusCode || 500).send({
    message: error.message || 'Erro interno no servidor',
  });
});

// Inicialização do servidor
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
