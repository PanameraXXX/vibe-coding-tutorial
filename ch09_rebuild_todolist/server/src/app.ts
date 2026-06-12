import express from 'express';
import cors from 'cors';
import type Database from 'better-sqlite3';
import { createTodosRouter } from './routes/todos';

// 注入 db 便于测试时使用内存连接
export function createApp(db: Database.Database) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/todos', createTodosRouter(db));
  return app;
}
