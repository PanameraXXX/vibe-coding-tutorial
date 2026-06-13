import { Router, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import {
  createUser,
  getUserByName,
  getUserById,
  verifyPassword,
} from '../services/users';

function readCredentials(req: Request): { username: string; password: string } | null {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!username || !password) return null;
  return { username, password };
}

export function createAuthRouter(db: Database.Database): Router {
  const router = Router();

  router.post('/register', (req: Request, res: Response) => {
    const creds = readCredentials(req);
    if (!creds) {
      res.status(400).json({ error: 'username 与 password 必填' });
      return;
    }
    if (getUserByName(db, creds.username)) {
      res.status(409).json({ error: '用户名已被占用' });
      return;
    }
    const user = createUser(db, creds);
    req.session.userId = user.id;
    res.status(201).json(user);
  });

  router.post('/login', (req: Request, res: Response) => {
    const creds = readCredentials(req);
    if (!creds) {
      res.status(400).json({ error: 'username 与 password 必填' });
      return;
    }
    const row = getUserByName(db, creds.username);
    if (!row || !verifyPassword(creds.password, row.passwordHash)) {
      res.status(401).json({ error: '账号或密码错误' });
      return;
    }
    req.session.userId = row.id;
    res.status(200).json({ id: row.id, username: row.username, createdAt: row.createdAt });
  });

  router.post('/logout', (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.status(204).end();
    });
  });

  router.get('/me', (req: Request, res: Response) => {
    const uid = req.session.userId;
    if (!uid) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const user = getUserById(db, uid);
    if (!user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    res.status(200).json(user);
  });

  return router;
}
