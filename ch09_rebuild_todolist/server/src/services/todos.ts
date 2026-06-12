import type Database from 'better-sqlite3';
import type { Todo, CreateTodoInput } from '../types';

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
