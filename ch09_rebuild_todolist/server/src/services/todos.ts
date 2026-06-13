import type Database from 'better-sqlite3';
import type { Todo, CreateTodoInput, UpdateTodoInput } from '../types';

interface TodoRow {
  id: number;
  title: string;
  done: number;
  created_at: string;
}

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    done: row.done === 1,
    createdAt: row.created_at,
  };
}

export function createTodo(
  db: Database.Database,
  userId: number,
  input: CreateTodoInput
): Todo {
  const createdAt = new Date().toISOString();
  const info = db
    .prepare(
      'INSERT INTO todos (title, done, created_at, user_id) VALUES (?, 0, ?, ?)'
    )
    .run(input.title, createdAt, userId);
  return {
    id: Number(info.lastInsertRowid),
    title: input.title,
    done: false,
    createdAt,
  };
}

export function getAllTodos(db: Database.Database, userId: number): Todo[] {
  const rows = db
    .prepare(
      'SELECT id, title, done, created_at FROM todos WHERE user_id = ? ORDER BY id ASC'
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
      'SELECT id, title, done, created_at FROM todos WHERE id = ? AND user_id = ?'
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
