import bcrypt from 'bcryptjs';
import type Database from 'better-sqlite3';
import type { User, CreateUserInput } from '../types';

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

// 暴露给 routes/auth 用的"含哈希"形态
export interface UserWithHash {
  id: number;
  username: string;
  createdAt: string;
  passwordHash: string;
}

function rowToUser(row: UserRow): User {
  return { id: row.id, username: row.username, createdAt: row.created_at };
}

export function createUser(db: Database.Database, input: CreateUserInput): User {
  const passwordHash = bcrypt.hashSync(input.password, 10);
  const createdAt = new Date().toISOString();
  const info = db
    .prepare(
      'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)'
    )
    .run(input.username, passwordHash, createdAt);
  return {
    id: Number(info.lastInsertRowid),
    username: input.username,
    createdAt,
  };
}

export function getUserByName(
  db: Database.Database,
  username: string
): UserWithHash | null {
  const row = db
    .prepare(
      'SELECT id, username, password_hash, created_at FROM users WHERE username = ?'
    )
    .get(username) as UserRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
    passwordHash: row.password_hash,
  };
}

export function getUserById(db: Database.Database, id: number): User | null {
  const row = db
    .prepare('SELECT id, username, password_hash, created_at FROM users WHERE id = ?')
    .get(id) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}
