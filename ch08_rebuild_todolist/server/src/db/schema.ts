import type Database from 'better-sqlite3';

interface ColumnInfo {
  name: string;
}

// 在传入的连接上建表（如不存在）
// 阶段 3：todos 加 category / priority / due_date 三列（全部 NULL 允许，老数据保留）
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

  // 2. todos 表（新库直接含全部列）
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      category   TEXT,
      priority   INTEGER,
      due_date   TEXT
    );
  `);

  // 3. 阶段 1 老库迁移：若 todos 没有 user_id 列，则清空老数据再 ALTER
  const cols = db
    .prepare(`PRAGMA table_info(todos)`)
    .all() as ColumnInfo[];
  const colNames = cols.map((c) => c.name);
  const hasUserId = colNames.includes('user_id');
  if (!hasUserId) {
    db.exec(`DELETE FROM todos;`);
    db.exec(`ALTER TABLE todos ADD COLUMN user_id INTEGER NOT NULL REFERENCES users(id);`);
  }

  // 4. 阶段 3 老库迁移：缺哪列加哪列（保留数据）
  if (!colNames.includes('category')) {
    db.exec(`ALTER TABLE todos ADD COLUMN category TEXT;`);
  }
  if (!colNames.includes('priority')) {
    db.exec(`ALTER TABLE todos ADD COLUMN priority INTEGER;`);
  }
  if (!colNames.includes('due_date')) {
    db.exec(`ALTER TABLE todos ADD COLUMN due_date TEXT;`);
  }
}
