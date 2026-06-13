import { Router, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import {
  createTodo,
  getAllTodos,
  updateTodo,
  deleteTodo,
} from '../services/todos';
import type { ListFilters } from '../types';

// 此处假定上游已经过 requireAuth 中间件，session.userId 一定存在
function userId(req: Request): number {
  return req.session.userId as number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// 校验：允许 undefined（不传）/ null（清空）/ 合法值
type Validated<T> = { ok: true; value: T } | { ok: false };

function validatePriority(v: unknown): Validated<1 | 2 | 3 | null | undefined> {
  if (v === undefined) return { ok: true, value: undefined };
  if (v === null) return { ok: true, value: null };
  if (v === 1 || v === 2 || v === 3) return { ok: true, value: v };
  return { ok: false };
}

function validateDueDate(v: unknown): Validated<string | null | undefined> {
  if (v === undefined) return { ok: true, value: undefined };
  if (v === null) return { ok: true, value: null };
  if (typeof v === 'string' && ISO_DATE.test(v)) return { ok: true, value: v };
  return { ok: false };
}

function validateCategory(v: unknown): Validated<string | null | undefined> {
  if (v === undefined) return { ok: true, value: undefined };
  if (v === null) return { ok: true, value: null };
  if (typeof v === 'string') return { ok: true, value: v };
  return { ok: false };
}

export function createTodosRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const filters: ListFilters = {};

    const done = req.query.done;
    if (done !== undefined) {
      if (done !== 'active' && done !== 'done') {
        res.status(400).json({ error: 'done 必须是 active 或 done' });
        return;
      }
      filters.done = done;
    }

    const category = req.query.category;
    if (typeof category === 'string' && category.trim()) {
      filters.category = category;
    }

    const priority = req.query.priority;
    if (priority !== undefined) {
      if (priority !== '1' && priority !== '2' && priority !== '3') {
        res.status(400).json({ error: 'priority 必须是 1/2/3' });
        return;
      }
      filters.priority = Number(priority) as 1 | 2 | 3;
    }

    const due = req.query.due;
    if (due !== undefined) {
      if (
        due !== 'today' &&
        due !== 'week' &&
        due !== 'overdue' &&
        due !== 'none'
      ) {
        res.status(400).json({ error: 'due 非法' });
        return;
      }
      filters.due = due;
    }

    const q = req.query.q;
    if (typeof q === 'string' && q.length > 0) {
      filters.q = q;
    }

    res.json(getAllTodos(db, userId(req), filters));
  });

  router.post('/', (req: Request, res: Response) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title) {
      res.status(400).json({ error: 'title 必填' });
      return;
    }
    const cat = validateCategory(req.body?.category);
    const pri = validatePriority(req.body?.priority);
    const due = validateDueDate(req.body?.dueDate);
    if (!cat.ok) {
      res.status(400).json({ error: 'category 非法' });
      return;
    }
    if (!pri.ok) {
      res.status(400).json({ error: 'priority 必须是 1/2/3' });
      return;
    }
    if (!due.ok) {
      res.status(400).json({ error: 'dueDate 必须是 YYYY-MM-DD' });
      return;
    }
    const todo = createTodo(db, userId(req), {
      title,
      category: cat.value,
      priority: pri.value,
      dueDate: due.value,
    });
    res.status(201).json(todo);
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'id 非法' });
      return;
    }
    const body = req.body ?? {};
    const cat = validateCategory(body.category);
    const pri = validatePriority(body.priority);
    const due = validateDueDate(body.dueDate);
    if (!cat.ok) {
      res.status(400).json({ error: 'category 非法' });
      return;
    }
    if (!pri.ok) {
      res.status(400).json({ error: 'priority 必须是 1/2/3' });
      return;
    }
    if (!due.ok) {
      res.status(400).json({ error: 'dueDate 必须是 YYYY-MM-DD' });
      return;
    }

    const updated = updateTodo(db, userId(req), id, {
      title: typeof body.title === 'string' ? body.title : undefined,
      done: typeof body.done === 'boolean' ? body.done : undefined,
      category: cat.value,
      priority: pri.value,
      dueDate: due.value,
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
    const ok = deleteTodo(db, userId(req), id);
    if (!ok) {
      res.status(404).json({ error: '未找到' });
      return;
    }
    res.status(204).end();
  });

  return router;
}
