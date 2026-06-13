import { describe, it, expect } from 'vitest';
import { createTestDb } from './setup';
import {
  createTodo,
  getAllTodos,
  updateTodo,
  deleteTodo,
} from '../src/services/todos';
import { createUser } from '../src/services/users';

function bootstrap() {
  const db = createTestDb();
  const alice = createUser(db, { username: 'alice', password: 'pw' });
  const bob = createUser(db, { username: 'bob', password: 'pw' });
  return { db, aliceId: alice.id, bobId: bob.id };
}

describe('todos service', () => {
  it('create + getAll：新建后能查到', () => {
    const { db, aliceId } = bootstrap();
    const created = createTodo(db, aliceId, { title: '买牛奶' });
    expect(created.id).toBeGreaterThan(0);
    expect(created.title).toBe('买牛奶');
    expect(created.done).toBe(false);

    const all = getAllTodos(db, aliceId);
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('买牛奶');
  });

  it('update：能改 title 和 done', () => {
    const { db, aliceId } = bootstrap();
    const t = createTodo(db, aliceId, { title: '买牛奶' });
    const updated = updateTodo(db, aliceId, t.id, { done: true, title: '买脱脂牛奶' });
    expect(updated).not.toBeNull();
    expect(updated!.done).toBe(true);
    expect(updated!.title).toBe('买脱脂牛奶');
  });

  it('update：id 不存在返回 null', () => {
    const { db, aliceId } = bootstrap();
    expect(updateTodo(db, aliceId, 999, { done: true })).toBeNull();
  });

  it('delete：删除后查不到', () => {
    const { db, aliceId } = bootstrap();
    const t = createTodo(db, aliceId, { title: '买面包' });
    expect(deleteTodo(db, aliceId, t.id)).toBe(true);
    expect(getAllTodos(db, aliceId)).toHaveLength(0);
  });

  it('delete：id 不存在返回 false', () => {
    const { db, aliceId } = bootstrap();
    expect(deleteTodo(db, aliceId, 999)).toBe(false);
  });

  it('getAll：用户 A 看不到用户 B 的 todos', () => {
    const { db, aliceId, bobId } = bootstrap();
    createTodo(db, aliceId, { title: 'alice 1' });
    createTodo(db, bobId, { title: 'bob 1' });
    createTodo(db, bobId, { title: 'bob 2' });

    const aliceList = getAllTodos(db, aliceId);
    expect(aliceList).toHaveLength(1);
    expect(aliceList[0].title).toBe('alice 1');

    const bobList = getAllTodos(db, bobId);
    expect(bobList).toHaveLength(2);
  });

  it('updateTodo / deleteTodo：跨用户访问视为不存在', () => {
    const { db, aliceId, bobId } = bootstrap();
    const aliceTodo = createTodo(db, aliceId, { title: '私人事项' });

    // bob 试图改 alice 的 todo
    expect(updateTodo(db, bobId, aliceTodo.id, { done: true })).toBeNull();
    // bob 试图删 alice 的 todo
    expect(deleteTodo(db, bobId, aliceTodo.id)).toBe(false);
    // alice 自己看仍然在
    expect(getAllTodos(db, aliceId)).toHaveLength(1);
    expect(getAllTodos(db, aliceId)[0].done).toBe(false);
  });

  it('create：可带 category/priority/dueDate', () => {
    const { db, aliceId } = bootstrap();
    const t = createTodo(db, aliceId, {
      title: '写课件',
      category: '工作',
      priority: 3,
      dueDate: '2026-06-20',
    });
    expect(t.category).toBe('工作');
    expect(t.priority).toBe(3);
    expect(t.dueDate).toBe('2026-06-20');

    const all = getAllTodos(db, aliceId);
    expect(all[0].category).toBe('工作');
    expect(all[0].priority).toBe(3);
    expect(all[0].dueDate).toBe('2026-06-20');
  });

  it('create：不传新字段则三列均为 null', () => {
    const { db, aliceId } = bootstrap();
    const t = createTodo(db, aliceId, { title: '裸标题' });
    expect(t.category).toBeNull();
    expect(t.priority).toBeNull();
    expect(t.dueDate).toBeNull();
  });

  it('排序：priority DESC NULLS LAST，同优先级按 dueDate ASC NULLS LAST', () => {
    const { db, aliceId } = bootstrap();
    createTodo(db, aliceId, { title: 'B 高 早', priority: 3, dueDate: '2026-06-15' });
    createTodo(db, aliceId, { title: 'C 高 晚', priority: 3, dueDate: '2026-06-20' });
    createTodo(db, aliceId, { title: 'E 中 中', priority: 2, dueDate: '2026-06-18' });
    createTodo(db, aliceId, { title: 'D 低 早', priority: 1, dueDate: '2026-06-15' });
    createTodo(db, aliceId, { title: 'A 中无日期', priority: 2 });
    createTodo(db, aliceId, { title: 'F 全空' });

    const titles = getAllTodos(db, aliceId).map((t) => t.title);
    expect(titles).toEqual([
      'B 高 早',
      'C 高 晚',
      'E 中 中',
      'A 中无日期',
      'D 低 早',
      'F 全空',
    ]);
  });

  it('update：传 null 清空字段', () => {
    const { db, aliceId } = bootstrap();
    const t = createTodo(db, aliceId, {
      title: 'x',
      category: '工作',
      priority: 2,
      dueDate: '2026-06-15',
    });
    const updated = updateTodo(db, aliceId, t.id, {
      category: null,
      priority: null,
      dueDate: null,
    });
    expect(updated!.category).toBeNull();
    expect(updated!.priority).toBeNull();
    expect(updated!.dueDate).toBeNull();
  });

  it('update：不传字段则不动', () => {
    const { db, aliceId } = bootstrap();
    const t = createTodo(db, aliceId, {
      title: 'x',
      category: '工作',
      priority: 2,
      dueDate: '2026-06-15',
    });
    const updated = updateTodo(db, aliceId, t.id, { title: 'y' });
    expect(updated!.title).toBe('y');
    expect(updated!.category).toBe('工作');
    expect(updated!.priority).toBe(2);
    expect(updated!.dueDate).toBe('2026-06-15');
  });
});
