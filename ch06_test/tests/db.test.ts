// db.ts 数据层 —— 10 个用例
// 关键策略：vi.resetModules() + 设 DB_PATH=:memory: + 动态 import
// 让每个测试套件拿到一个全新的、空的内存数据库
import { describe, it, expect, beforeEach } from 'vitest';

type DbModule = typeof import('../../ch05_manual_todolist/todolist/server/src/db.ts');

async function freshDb(): Promise<DbModule> {
  // 清掉模块缓存，下一次 import 会重新执行 new Database(':memory:')
  const { vi } = await import('vitest');
  vi.resetModules();
  process.env.DB_PATH = ':memory:';
  return await import('../../ch05_manual_todolist/todolist/server/src/db.ts');
}

describe('db.ts', () => {
  let db: DbModule;

  beforeEach(async () => {
    db = await freshDb();
  });

  it('createTodo 默认值正确', () => {
    const todo = db.createTodo(1, { title: '写代码' });
    expect(todo.title).toBe('写代码');
    expect(todo.category).toBe('other');
    expect(todo.priority).toBe('medium');
    expect(todo.completed).toBe(false);
    expect(todo.due_date).toBeNull();
    expect(todo.id).toBeGreaterThan(0);
  });

  it('getTodo 取自己的 todo 返回完整对象', () => {
    const created = db.createTodo(1, { title: '看书' });
    const fetched = db.getTodo(1, created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.title).toBe('看书');
  });

  it('getTodo 取别人的 todo 返回 null（越权防护）', () => {
    const t = db.createTodo(1, { title: 'user1 的私密' });
    expect(db.getTodo(2, t.id)).toBeNull();
  });

  it('listTodos 只返回自己的 todo（user_id 隔离）', () => {
    db.createTodo(1, { title: 'a' });
    db.createTodo(1, { title: 'b' });
    db.createTodo(2, { title: 'c' });

    expect(db.listTodos(1)).toHaveLength(2);
    expect(db.listTodos(2)).toHaveLength(1);
    expect(db.listTodos(99)).toHaveLength(0);
  });

  it('listTodos 排序正确：high → medium → low（防字典序回归）', () => {
    // 故意按字母序乱序插入：low, high, medium
    db.createTodo(1, { title: '低任务', priority: 'low' });
    db.createTodo(1, { title: '高任务', priority: 'high' });
    db.createTodo(1, { title: '中任务', priority: 'medium' });

    const titles = db.listTodos(1).map((t) => t.title);
    expect(titles).toEqual(['高任务', '中任务', '低任务']);
  });

  it('listTodos 已完成的 todo 排在最后', () => {
    const a = db.createTodo(1, { title: '完成的-高', priority: 'high' });
    db.createTodo(1, { title: '未完成-低', priority: 'low' });
    db.updateTodo(1, a.id, { completed: true });

    const list = db.listTodos(1);
    expect(list[0].completed).toBe(false);
    expect(list[list.length - 1].completed).toBe(true);
  });

  it('updateTodo 改 priority 时排序权重同步更新', () => {
    const a = db.createTodo(1, { title: 'A', priority: 'low' });
    const b = db.createTodo(1, { title: 'B', priority: 'medium' });
    // 一开始 B(medium) 应在 A(low) 前面
    expect(db.listTodos(1).map((t) => t.title)).toEqual(['B', 'A']);

    // 把 A 提到 high，应该跳到最前面
    db.updateTodo(1, a.id, { priority: 'high' });
    expect(db.listTodos(1).map((t) => t.title)).toEqual(['A', 'B']);
    // 顺便确认 b 没动
    expect(db.getTodo(1, b.id)!.priority).toBe('medium');
  });

  it('updateTodo 改别人的 todo 返回 null 且数据不变', () => {
    const t = db.createTodo(1, { title: '原标题' });
    const result = db.updateTodo(2, t.id, { title: '被篡改' });
    expect(result).toBeNull();
    // 原数据没变
    expect(db.getTodo(1, t.id)!.title).toBe('原标题');
  });

  it('deleteTodo 删别人的 todo 返回 false 且数据还在', () => {
    const t = db.createTodo(1, { title: '不能被删' });
    expect(db.deleteTodo(2, t.id)).toBe(false);
    expect(db.getTodo(1, t.id)).not.toBeNull();
  });

  it('claimOrphanTodos 把 user_id=0 的 todo 全部认领给指定用户', () => {
    // 模拟老数据：直接走 db handle 插 user_id=0 的
    db.db
      .prepare(
        "INSERT INTO todos (title, category, priority, priority_sort, user_id, created_at) VALUES (?, 'other', 'medium', 2, 0, ?)"
      )
      .run('老数据1', new Date().toISOString());
    db.db
      .prepare(
        "INSERT INTO todos (title, category, priority, priority_sort, user_id, created_at) VALUES (?, 'other', 'medium', 2, 0, ?)"
      )
      .run('老数据2', new Date().toISOString());
    // 再插一条已属于 user=5 的，验证不会被错误接管
    db.createTodo(5, { title: '别人的不动它' });

    const claimed = db.claimOrphanTodos(1);
    expect(claimed).toBe(2);
    expect(db.listTodos(1)).toHaveLength(2);
    expect(db.listTodos(5)).toHaveLength(1);

    // 二次调用：没新孤儿了
    expect(db.claimOrphanTodos(1)).toBe(0);
  });
});
