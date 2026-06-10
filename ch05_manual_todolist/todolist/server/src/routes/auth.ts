// /api/auth：注册、登录、登出、当前用户
import { Router, Request, Response } from 'express';
import { createUser, getUserByName, getUserById, verifyPassword, countUsers } from '../users.js';
import { claimOrphanTodos } from '../db.js';

const router = Router();

// 用户名/密码基础校验：3-20 位用户名，密码 ≥6 位
function validateCredentials(username: unknown, password: unknown): string | null {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return '用户名需 3-20 位字母数字下划线';
  }
  if (typeof password !== 'string' || password.length < 6) {
    return '密码至少 6 位';
  }
  return null;
}

// POST /api/auth/register —— 注册并自动登录；首注册用户认领孤儿 todos
router.post('/register', (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};
  const err = validateCredentials(username, password);
  if (err) return res.status(400).json({ error: err });

  if (getUserByName(username)) {
    return res.status(409).json({ error: '用户名已被占用' });
  }

  const isFirst = countUsers() === 0;
  const user = createUser(username, password);

  // 首注册用户接管所有 user_id=0 的老数据
  let claimed = 0;
  if (isFirst) {
    claimed = claimOrphanTodos(user.id);
  }

  req.session.userId = user.id;
  res.status(201).json({ user, claimed });
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }
  const row = getUserByName(username);
  if (!row || !verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  req.session.userId = row.id;
  res.json({ user: { id: row.id, username: row.username, created_at: row.created_at } });
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// GET /api/auth/me —— 返回当前登录用户；未登录返回 null
router.get('/me', (req: Request, res: Response) => {
  const id = req.session.userId;
  if (!id) return res.json({ user: null });
  const user = getUserById(id);
  res.json({ user });
});

export default router;
