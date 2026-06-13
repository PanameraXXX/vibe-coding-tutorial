import express from 'express';
import cors from 'cors';
import session from 'express-session';
import sqliteStoreFactory from 'better-sqlite3-session-store';
import type Database from 'better-sqlite3';
import { createTodosRouter } from './routes/todos';
import { createAuthRouter } from './routes/auth';
import { requireAuth } from './middleware/requireAuth';

const SqliteStore = sqliteStoreFactory(session);

// 注入 db 便于测试时使用内存连接
export function createApp(db: Database.Database) {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json());

  app.use(
    session({
      store: new SqliteStore({
        client: db,
        expired: { clear: true, intervalMs: 15 * 60 * 1000 },
      }),
      secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/todos', requireAuth, createTodosRouter(db));

  return app;
}
