import type Database from 'better-sqlite3';

interface ColumnInfo {
  name: string;
}

// 在传入的连接上建表（如不存在）
// 阶段 2：新增 users 表；todos 加 user_id 列。若旧库不含 user_id，先清空 todos 再 ALTER。
export function initSchema(db: Database.Database): void {
  // 1. users 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    NOT NULL
    );
  `);

  // 2. todos 表（新库直接含 user_id）
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      user_id    INTEGER NOT NULL REFERENCES users(id)
    );
  `);

  // 3. 阶段 1 老库迁移：若 todos 没有 user_id 列，则清空老数据再 ALTER
  const cols = db
    .prepare(`PRAGMA table_info(todos)`)
    .all() as ColumnInfo[];
  const hasUserId = cols.some((c) => c.name === 'user_id');
  if (!hasUserId) {
    db.exec(`DELETE FROM todos;`);
    db.exec(`ALTER TABLE todos ADD COLUMN user_id INTEGER NOT NULL REFERENCES users(id);`);
  }
}
