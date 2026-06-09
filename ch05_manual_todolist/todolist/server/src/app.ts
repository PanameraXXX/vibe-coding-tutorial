// Express 应用配置
import express from 'express';
import cors from 'cors';
import todosRouter from './routes/todos.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // 健康检查
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // 业务路由
  app.use('/api/todos', todosRouter);

  return app;
}
