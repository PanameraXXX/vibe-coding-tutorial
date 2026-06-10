// /api/todos 路由（requireAuth 已在 app.ts 上层保护，这里直接取 session.userId）
import { Router, Request, Response } from 'express';
import { listTodos, createTodo, updateTodo, deleteTodo } from '../db.js';
import { CATEGORIES, PRIORITIES, isValidDueDate } from '../types/todo.js';
import type { Category, Priority } from '../types/todo.js';

const VALID_CATEGORIES = new Set(CATEGORIES.map((c) => c.value));
const VALID_PRIORITIES = new Set(PRIORITIES.map((p) => p.value));

const router = Router();

// GET /api/todos —— 当前用户的待办；可选 ?category= 过滤
router.get('/', (req: Request, res: Response) => {
  const userId = req.session.userId!;
  const cat = req.query.category as string | undefined;
  if (cat && !VALID_CATEGORIES.has(cat as Category)) {
    return res.status(400).json({ error: '分类不合法' });
  }
  res.json(listTodos(userId, cat as Category | undefined));
});

// POST /api/todos —— 创建待办
router.post('/', (req: Request, res: Response) => {
  const userId = req.session.userId!;
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) return res.status(400).json({ error: 'title 不能为空' });

  const { category, priority, due_date } = req.body ?? {};
  if (category !== undefined && !VALID_CATEGORIES.has(category))
    return res.status(400).json({ error: '分类不合法' });
  if (priority !== undefined && !VALID_PRIORITIES.has(priority))
    return res.status(400).json({ error: '优先级不合法' });
  if (due_date !== undefined && due_date !== null && !isValidDueDate(due_date))
    return res.status(400).json({ error: 'due_date 必须为 YYYY-MM-DD 合法日期' });

  const todo = createTodo(userId, { title, category, priority, due_date });
  res.status(201).json(todo);
});

// PATCH /api/todos/:id
router.patch('/:id', (req: Request, res: Response) => {
  const userId = req.session.userId!;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'id 不合法' });

  const { title, completed, category, priority, due_date } = req.body ?? {};

  if (title !== undefined && typeof title !== 'string')
    return res.status(400).json({ error: 'title 必须是字符串' });
  if (completed !== undefined && typeof completed !== 'boolean')
    return res.status(400).json({ error: 'completed 必须是布尔值' });
  if (category !== undefined && !VALID_CATEGORIES.has(category))
    return res.status(400).json({ error: '分类不合法' });
  if (priority !== undefined && !VALID_PRIORITIES.has(priority))
    return res.status(400).json({ error: '优先级不合法' });
  if (due_date !== undefined && due_date !== null && !isValidDueDate(due_date))
    return res.status(400).json({ error: 'due_date 必须为 YYYY-MM-DD 合法日期或 null' });
  if (title === undefined && completed === undefined && category === undefined && priority === undefined && due_date === undefined)
    return res.status(400).json({ error: '至少传入一个更新字段' });

  const updated = updateTodo(userId, id, {
    ...(title !== undefined ? { title: title.trim() } : {}),
    ...(completed !== undefined ? { completed } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(priority !== undefined ? { priority } : {}),
    ...(due_date !== undefined ? { due_date } : {}),
  });

  if (!updated) return res.status(404).json({ error: '待办不存在' });
  res.json(updated);
});

// DELETE /api/todos/:id
router.delete('/:id', (req: Request, res: Response) => {
  const userId = req.session.userId!;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'id 不合法' });
  if (!deleteTodo(userId, id)) return res.status(404).json({ error: '待办不存在' });
  res.json({ success: true });
});

export default router;