// 用户数据层：注册、按名字查、按 id 查
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

// users 表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL
  );
`);

export interface User {
  id: number;
  username: string;
  created_at: string;
}

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export function getUserByName(username: string): UserRow | null {
  const row = db
    .prepare<[string], UserRow>(
      'SELECT id, username, password_hash, created_at FROM users WHERE username = ?'
    )
    .get(username);
  return row ?? null;
}

export function getUserById(id: number): User | null {
  const row = db
    .prepare<[number], UserRow>(
      'SELECT id, username, password_hash, created_at FROM users WHERE id = ?'
    )
    .get(id);
  if (!row) return null;
  return { id: row.id, username: row.username, created_at: row.created_at };
}

// 注册：返回新用户；用户名重复抛错；密码用 bcrypt 哈希
export function createUser(username: string, password: string): User {
  const hash = bcrypt.hashSync(password, 10);
  const createdAt = new Date().toISOString();
  const result = db
    .prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)')
    .run(username, hash, createdAt);
  const id = Number(result.lastInsertRowid);
  return { id, username, created_at: createdAt };
}

// 验证密码
export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

// 统计用户数（用于"首注册用户认领老 todos"逻辑）
export function countUsers(): number {
  const row = db.prepare<[], { c: number }>('SELECT COUNT(*) AS c FROM users').get();
  return row?.c ?? 0;
}
