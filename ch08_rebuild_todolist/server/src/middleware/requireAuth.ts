import type { Request, Response, NextFunction } from 'express';

// 受保护接口的看门人：未登录返回 401
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: '请先登录' });
    return;
  }
  next();
}
