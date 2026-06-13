import type Database from 'better-sqlite3';
import type { Todo, CreateTodoInput, UpdateTodoInput, ListFilters } from '../types';

interface TodoRow {
  id: number;
  title: string;
  done: number;
  created_at: string;
  category: string | null;
  priority: number | null;
  due_date: string | null;
}

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    done: row.done === 1,
    createdAt: row.created_at,
    category: row.category,
    priority:
      row.priority === 1 || row.priority === 2 || row.priority === 3
        ? row.priority
        : null,
    dueDate: row.due_date,
  };
}

const SELECT_COLUMNS =
  'id, title, done, created_at, category, priority, due_date';

const ORDER_BY =
  'ORDER BY priority DESC NULLS LAST, due_date ASC NULLS LAST, id ASC';

export function createTodo(
  db: Database.Database,
  userId: number,
  input: CreateTodoInput
): Todo {
  const createdAt = new Date().toISOString();
  const category = input.category ?? null;
  const priority = input.priority ?? null;
  const dueDate = input.dueDate ?? null;
  const info = db
    .prepare(
      'INSERT INTO todos (title, done, created_at, user_id, category, priority, due_date) VALUES (?, 0, ?, ?, ?, ?, ?)'
    )
    .run(input.title, createdAt, userId, category, priority, dueDate);
  return {
    id: Number(info.lastInsertRowid),
    title: input.title,
    done: false,
    createdAt,
    category,
    priority:
      priority === 1 || priority === 2 || priority === 3 ? priority : null,
    dueDate,
  };
}

export function getAllTodos(
  db: Database.Database,
  userId: number,
  filters: ListFilters = {}
): Todo[] {
  const where: string[] = ['user_id = ?'];
  const params: (string | number)[] = [userId];

  if (filters.done === 'active') where.push('done = 0');
  if (filters.done === 'done') where.push('done = 1');

  if (filters.category) {
    where.push('category = ?');
    params.push(filters.category);
  }
  if (filters.priority) {
    where.push('priority = ?');
    params.push(filters.priority);
  }

  const sql = `SELECT ${SELECT_COLUMNS} FROM todos WHERE ${where.join(' AND ')} ${ORDER_BY}`;
  const rows = db.prepare(sql).all(...params) as TodoRow[];
  return rows.map(rowToTodo);
}

export function updateTodo(
  db: Database.Database,
  userId: number,
  id: number,
  input: UpdateTodoInput
): Todo | null {
  const existing = db
    .prepare(
      `SELECT ${SELECT_COLUMNS} FROM todos WHERE id = ? AND user_id = ?`
    )
    .get(id, userId) as TodoRow | undefined;
  if (!existing) return null;

  // 语义：input 字段为 undefined → 不动；为 null → 清空；为值 → 更新
  const nextTitle = input.title ?? existing.title;
  const nextDone = input.done === undefined ? existing.done : input.done ? 1 : 0;
  const nextCategory =
    input.category === undefined ? existing.category : input.category;
  const nextPriority =
    input.priority === undefined ? existing.priority : input.priority;
  const nextDueDate =
    input.dueDate === undefined ? existing.due_date : input.dueDate;

  db.prepare(
    `UPDATE todos
       SET title = ?, done = ?, category = ?, priority = ?, due_date = ?
     WHERE id = ? AND user_id = ?`
  ).run(nextTitle, nextDone, nextCategory, nextPriority, nextDueDate, id, userId);

  return rowToTodo({
    ...existing,
    title: nextTitle,
    done: nextDone,
    category: nextCategory,
    priority: nextPriority,
    due_date: nextDueDate,
  });
}

export function deleteTodo(
  db: Database.Database,
  userId: number,
  id: number
): boolean {
  const info = db
    .prepare('DELETE FROM todos WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return info.changes > 0;
}
