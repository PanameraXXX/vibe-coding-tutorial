import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema';

interface ColumnInfo {
  name: string;
}

function listColumns(db: Database.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[]).map(
    (c) => c.name
  );
}

describe('schema initSchema', () => {
  it('新建库：todos 含 category/priority/due_date 三列', () => {
    const db = new Database(':memory:');
    initSchema(db);
    const cols = listColumns(db, 'todos');
    expect(cols).toContain('category');
    expect(cols).toContain('priority');
    expect(cols).toContain('due_date');
  });

  it('老库（无三列）：迁移后三列存在', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id)
      );
    `);
    initSchema(db);
    const cols = listColumns(db, 'todos');
    expect(cols).toContain('category');
    expect(cols).toContain('priority');
    expect(cols).toContain('due_date');
  });

  it('老库已有 todos 数据：迁移后数据保留', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id)
      );
      INSERT INTO users (username, password_hash, created_at)
        VALUES ('alice', 'h', '2026-06-13T00:00:00.000Z');
      INSERT INTO todos (title, done, created_at, user_id)
        VALUES ('老数据', 0, '2026-06-13T00:00:00.000Z', 1);
    `);
    initSchema(db);
    const rows = db.prepare(`SELECT title, category, priority, due_date FROM todos`).all() as Array<{
      title: string;
      category: string | null;
      priority: number | null;
      due_date: string | null;
    }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('老数据');
    expect(rows[0].category).toBeNull();
    expect(rows[0].priority).toBeNull();
    expect(rows[0].due_date).toBeNull();
  });
});
