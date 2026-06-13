import { describe, it, expect } from 'vitest';
import { createTestDb } from './setup';
import {
  createUser,
  getUserByName,
  getUserById,
  verifyPassword,
} from '../src/services/users';

describe('users service', () => {
  it('createUser：成功创建并返回不含 password_hash 的 User', () => {
    const db = createTestDb();
    const u = createUser(db, { username: 'alice', password: 'pw123' });
    expect(u.id).toBeGreaterThan(0);
    expect(u.username).toBe('alice');
    expect(typeof u.createdAt).toBe('string');
    // 类型上没有 password_hash 字段；用对象键也确认一次
    expect(Object.keys(u)).toEqual(['id', 'username', 'createdAt']);
  });

  it('createUser：用户名重复抛错', () => {
    const db = createTestDb();
    createUser(db, { username: 'alice', password: 'pw' });
    expect(() => createUser(db, { username: 'alice', password: 'pw2' })).toThrow();
  });

  it('getUserByName：找不到返回 null', () => {
    const db = createTestDb();
    expect(getUserByName(db, 'ghost')).toBeNull();
  });

  it('getUserByName + verifyPassword：正确密码通过', () => {
    const db = createTestDb();
    createUser(db, { username: 'alice', password: 'pw123' });
    const row = getUserByName(db, 'alice');
    expect(row).not.toBeNull();
    expect(verifyPassword('pw123', row!.passwordHash)).toBe(true);
  });

  it('getUserByName + verifyPassword：错误密码失败', () => {
    const db = createTestDb();
    createUser(db, { username: 'alice', password: 'pw123' });
    const row = getUserByName(db, 'alice');
    expect(verifyPassword('wrong', row!.passwordHash)).toBe(false);
  });

  it('getUserById：找到返回 User，找不到返回 null', () => {
    const db = createTestDb();
    const u = createUser(db, { username: 'alice', password: 'pw' });
    expect(getUserById(db, u.id)).toEqual(u);
    expect(getUserById(db, 999)).toBeNull();
  });
});
