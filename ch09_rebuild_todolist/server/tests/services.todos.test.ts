import { describe, it, expect } from 'vitest';
import { createTestDb } from './setup';
import { createTodo, getAllTodos } from '../src/services/todos';

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
});
