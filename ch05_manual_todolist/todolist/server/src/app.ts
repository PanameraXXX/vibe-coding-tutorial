// Express 应用配置：session + cors + 路由
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import session from 'express-session';
import SqliteStoreFactory from 'better-sqlite3-session-store';
import { db } from './db.js';
import todosRouter from './routes/todos.js';
import authRouter from './routes/auth.js';

const SqliteStore = SqliteStoreFactory(session);

// 受保护接口的看门人：未登录返回 401
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: '请先登录' });
  }
  next();
}

export function createApp() {
  const app = express();

  // CORS 必须显式 allow credentials，否则浏览器不会带 cookie
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
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
      },
    })
  );

  // 健康检查
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // auth 不需要登录
  app.use('/api/auth', authRouter);

  // todos 必须登录
  app.use('/api/todos', requireAuth, todosRouter);

  return app;
}
