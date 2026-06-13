import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema';

// 每个测试用例调用一次，得到一个干净的内存数据库
export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  initSchema(db);
  return db;
}
