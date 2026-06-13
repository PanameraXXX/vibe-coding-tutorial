import type Database from 'better-sqlite3';
import type { Todo, CreateTodoInput, UpdateTodoInput } from '../types';

interface TodoRow {
  id: number;
  title: string;
  done: number;
  created_at: string;
  category: string | null;
  priority: number | null;
  due_date: string | null;
}

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    done: row.done === 1,
    createdAt: row.created_at,
    category: row.category,
    priority:
      row.priority === 1 || row.priority === 2 || row.priority === 3
        ? row.priority
        : null,
    dueDate: row.due_date,
  };
}

const SELECT_COLUMNS =
  'id, title, done, created_at, category, priority, due_date';

export function createTodo(
  db: Database.Database,
  userId: number,
  input: CreateTodoInput
): Todo {
  const createdAt = new Date().toISOString();
  const category = input.category ?? null;
  const priority = input.priority ?? null;
  const dueDate = input.dueDate ?? null;
  const info = db
    .prepare(
      'INSERT INTO todos (title, done, created_at, user_id, category, priority, due_date) VALUES (?, 0, ?, ?, ?, ?, ?)'
    )
    .run(input.title, createdAt, userId, category, priority, dueDate);
  return {
    id: Number(info.lastInsertRowid),
    title: input.title,
    done: false,
    createdAt,
    category,
    priority:
      priority === 1 || priority === 2 || priority === 3 ? priority : null,
    dueDate,
  };
}

export function getAllTodos(db: Database.Database, userId: number): Todo[] {
  const rows = db
    .prepare(
      `SELECT ${SELECT_COLUMNS} FROM todos WHERE user_id = ? ` +
        `ORDER BY priority DESC NULLS LAST, due_date ASC NULLS LAST, id ASC`
    )
    .all(userId) as TodoRow[];
  return rows.map(rowToTodo);
}

export function updateTodo(
  db: Database.Database,
  userId: number,
  id: number,
  input: UpdateTodoInput
): Todo | null {
  const existing = db
    .prepare(
      `SELECT ${SELECT_COLUMNS} FROM todos WHERE id = ? AND user_id = ?`
    )
    .get(id, userId) as TodoRow | undefined;
  if (!existing) return null;

  const nextTitle = input.title ?? existing.title;
  const nextDone = input.done === undefined ? existing.done : input.done ? 1 : 0;
  db.prepare(
    'UPDATE todos SET title = ?, done = ? WHERE id = ? AND user_id = ?'
  ).run(nextTitle, nextDone, id, userId);
  return rowToTodo({ ...existing, title: nextTitle, done: nextDone });
}

export function deleteTodo(
  db: Database.Database,
  userId: number,
  id: number
): boolean {
  const info = db
    .prepare('DELETE FROM todos WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return info.changes > 0;
}
