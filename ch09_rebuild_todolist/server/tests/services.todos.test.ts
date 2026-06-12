import { describe, it, expect } from 'vitest';
import { createTestDb } from './setup';
import { createTodo, getAllTodos, updateTodo, deleteTodo } from '../src/services/todos';

describe('todos service', () => {
  it('create + getAll：新建后能查到', () => {
    const db = createTestDb();
    const created = createTodo(db, { title: '买牛奶' });
    expect(created.id).toBeGreaterThan(0);
    expect(created.title).toBe('买牛奶');
    expect(created.done).toBe(false);

    const all = getAllTodos(db);
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('买牛奶');
  });

  it('update：能改 title 和 done', () => {
    const db = createTestDb();
    const t = createTodo(db, { title: '买牛奶' });
    const updated = updateTodo(db, t.id, { done: true, title: '买脱脂牛奶' });
    expect(updated).not.toBeNull();
    expect(updated!.done).toBe(true);
    expect(updated!.title).toBe('买脱脂牛奶');
  });

  it('update：id 不存在返回 null', () => {
    const db = createTestDb();
    expect(updateTodo(db, 999, { done: true })).toBeNull();
  });

  it('delete：删除后查不到', () => {
    const db = createTestDb();
    const t = createTodo(db, { title: '买面包' });
    expect(deleteTodo(db, t.id)).toBe(true);
    expect(getAllTodos(db)).toHaveLength(0);
  });

  it('delete：id 不存在返回 false', () => {
    const db = createTestDb();
    expect(deleteTodo(db, 999)).toBe(false);
  });
});
