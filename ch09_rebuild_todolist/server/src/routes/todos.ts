import { Router, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import {
  createTodo,
  getAllTodos,
  updateTodo,
  deleteTodo,
} from '../services/todos';

export function createTodosRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.json(getAllTodos(db));
  });

  router.post('/', (req: Request, res: Response) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title) {
      res.status(400).json({ error: 'title 必填' });
      return;
    }
    const todo = createTodo(db, { title });
    res.status(201).json(todo);
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'id 非法' });
      return;
    }
    const { title, done } = req.body ?? {};
    const updated = updateTodo(db, id, {
      title: typeof title === 'string' ? title : undefined,
      done: typeof done === 'boolean' ? done : undefined,
    });
    if (!updated) {
      res.status(404).json({ error: '未找到' });
      return;
    }
    res.json(updated);
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'id 非法' });
      return;
    }
    const ok = deleteTodo(db, id);
    if (!ok) {
      res.status(404).json({ error: '未找到' });
      return;
    }
    res.status(204).end();
  });

  return router;
}
