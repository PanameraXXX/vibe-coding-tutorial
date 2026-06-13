import Database from 'better-sqlite3';
import path from 'node:path';
import { initSchema } from './schema';

// 打开（或创建）一个文件型 SQLite 连接
export function openDatabase(filename?: string): Database.Database {
  const file = filename ?? path.resolve(__dirname, '../../data/todolist.sqlite');
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  initSchema(db);
  return db;
}
