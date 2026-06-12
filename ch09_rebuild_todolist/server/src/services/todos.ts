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

export function createTodo(db: Database.Database, input: CreateTodoInput): Todo {
  const createdAt = new Date().toISOString();
  const stmt = db.prepare(
    'INSERT INTO todos (title, done, created_at) VALUES (?, 0, ?)'
  );
  const info = stmt.run(input.title, createdAt);
  return {
    id: Number(info.lastInsertRowid),
    title: input.title,
    done: false,
    createdAt,
  };
}

export function getAllTodos(db: Database.Database): Todo[] {
  const rows = db
    .prepare('SELECT id, title, done, created_at FROM todos ORDER BY id ASC')
    .all() as TodoRow[];
  return rows.map(rowToTodo);
}

export function updateTodo(
  db: Database.Database,
  id: number,
  input: UpdateTodoInput
): Todo | null {
  const existing = db
    .prepare('SELECT id, title, done, created_at FROM todos WHERE id = ?')
    .get(id) as TodoRow | undefined;
  if (!existing) return null;

  const nextTitle = input.title ?? existing.title;
  const nextDone = input.done === undefined ? existing.done : input.done ? 1 : 0;
  db.prepare('UPDATE todos SET title = ?, done = ? WHERE id = ?').run(
    nextTitle,
    nextDone,
    id
  );
  return rowToTodo({ ...existing, title: nextTitle, done: nextDone });
}

export function deleteTodo(db: Database.Database, id: number): boolean {
  const info = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  return info.changes > 0;
}
