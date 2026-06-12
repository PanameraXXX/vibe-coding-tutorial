import type Database from 'better-sqlite3';

// 在传入的连接上建表（如不存在）
export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
}
