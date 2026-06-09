// 数据库层：SQLite 初始化 + 待办增删改查
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { Todo, CreateTodoInput, UpdateTodoInput, Category, Priority } from './types/todo.js';
import { PRIORITY_SORT } from './types/todo.js';

const DB_PATH = process.env.DB_PATH ?? './data/todos.db';

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// 初始化表结构（含 category + priority + due_date）
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT    NOT NULL,
    completed     INTEGER NOT NULL DEFAULT 0,
    category      TEXT    NOT NULL DEFAULT 'other',
    priority      TEXT    NOT NULL DEFAULT 'medium',
    priority_sort INTEGER NOT NULL DEFAULT 2,
    due_date      TEXT,
    created_at    TEXT    NOT NULL
  );
`);

// 兼容旧表：新增列（生产环境应有正式迁移，这里偷懒 try-catch）
try { db.exec(`ALTER TABLE todos ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'`); } catch { /* ok */ }
try { db.exec(`ALTER TABLE todos ADD COLUMN priority_sort INTEGER NOT NULL DEFAULT 2`); } catch { /* ok */ }
try { db.exec(`ALTER TABLE todos ADD COLUMN due_date TEXT`); } catch { /* ok */ }

interface TodoRow {
  id: number;
  title: string;
  completed: number;
  category: string;
  priority: string;
  due_date: string | null;
  created_at: string;
}

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed === 1,
    category: row.category as Category,
    priority: row.priority as Priority,
    due_date: row.due_date,
    created_at: row.created_at,
  };
}

// ---------- 增删改查 ----------

// 查询：未完成在上 → 已过期(未完成)优先 → 按优先级(高→中→低) → 按创建时间倒序
// 用 SQL 当天日期判断过期：date('now', 'localtime') 是本地今天的 YYYY-MM-DD
function baseQuery(whereClause?: string, params?: (string | number)[]): Todo[] {
  const where = whereClause ?? '';
  const stmt = db.prepare(
    `SELECT id, title, completed, category, priority, due_date, created_at
     FROM todos ${where}
     ORDER BY
       completed ASC,
       CASE WHEN completed = 0 AND due_date IS NOT NULL AND due_date < date('now', 'localtime') THEN 0 ELSE 1 END ASC,
       priority_sort DESC,
       created_at DESC`
  );
  const rows = (params ? stmt.all(...params) : stmt.all()) as TodoRow[];
  return rows.map(rowToTodo);
}

export function listTodos(category?: Category): Todo[] {
  if (category) {
    return baseQuery('WHERE category = ?', [category]);
  }
  return baseQuery();
}

export function getTodo(id: number): Todo | null {
  const row = db
    .prepare<[number], TodoRow>(
      'SELECT id, title, completed, category, priority, due_date, created_at FROM todos WHERE id = ?'
    )
    .get(id);
  return row ? rowToTodo(row) : null;
}

export function createTodo(input: CreateTodoInput): Todo {
  const createdAt = new Date().toISOString();
  const category = input.category ?? 'other';
  const priority = input.priority ?? 'medium';
  const sortVal = PRIORITY_SORT[priority];
  const dueDate = input.due_date ?? null;
  const result = db
    .prepare(
      'INSERT INTO todos (title, completed, category, priority, priority_sort, due_date, created_at) VALUES (?, 0, ?, ?, ?, ?, ?)'
    )
    .run(input.title, category, priority, sortVal, dueDate, createdAt);
  return getTodo(Number(result.lastInsertRowid))!;
}

// 部分更新（title / completed / category / priority / due_date 任意组合）
export function updateTodo(id: number, input: UpdateTodoInput): Todo | null {
  const existing = getTodo(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.title !== undefined) {
    fields.push('title = ?');
    values.push(input.title);
  }
  if (input.completed !== undefined) {
    fields.push('completed = ?');
    values.push(input.completed ? 1 : 0);
  }
  if (input.category !== undefined) {
    fields.push('category = ?');
    values.push(input.category);
  }
  if (input.priority !== undefined) {
    fields.push('priority = ?');
    fields.push('priority_sort = ?');
    values.push(input.priority, PRIORITY_SORT[input.priority]);
  }
  if (input.due_date !== undefined) {
    fields.push('due_date = ?');
    values.push(input.due_date);
  }

  if (fields.length === 0) return existing;

  values.push(id);
  db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getTodo(id);
}

export function deleteTodo(id: number): boolean {
  const result = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  return result.changes > 0;
}