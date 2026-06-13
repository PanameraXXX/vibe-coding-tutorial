# 阶段 3 实现 plan：分类 + 优先级 + 截止日期

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 todo 增加 category / priority / dueDate 三个可选字段，按 priority DESC NULLS LAST + due_date ASC NULLS LAST 服务端排序，前端用统一 TodoForm 复用新增/编辑两种模式，整行进入编辑。

**Architecture:** 后端 SQLite 三列（全部 NULL 允许）+ 启动时 PRAGMA + ALTER TABLE 增量迁移；service 层做字段值校验（priority ∈ {1,2,3}、dueDate 匹配 ISO 日期）；PATCH 用 `null` 表示清空、`undefined` 表示不动。前端抽 `TodoForm` 复用，`TodoItem` 加 editing 状态切换两行视图与表单视图，所有写操作完成后 `TodosPage` refetch 列表保证排序一致。

**Tech Stack:** Express 4 + better-sqlite3 + vitest + supertest（后端）；React 18 + TypeScript + Vite + Tailwind（前端）。

**Spec:** `docs/superpowers/specs/2026-06-13-stage3-fields-design.md`

---

## File Structure

**后端：**
- `server/src/types.ts` — 扩展 `Todo` / `CreateTodoInput` / `UpdateTodoInput`
- `server/src/db/schema.ts` — 加三列 + 老库 ALTER TABLE 迁移
- `server/src/services/todos.ts` — create/update 接收新字段，update 支持 null 清空，getAll 改 ORDER BY
- `server/src/routes/todos.ts` — POST/PATCH 校验新字段，priority 非 1/2/3 → 400，dueDate 非 ISO → 400
- `server/tests/services.todos.test.ts` — 加 5 个用例
- `server/tests/routes.todos.test.ts` — 加 4 个用例
- `server/tests/db.schema.test.ts` — 新建，3 个用例

**前端：**
- `client/src/types.ts` — 扩展 `Todo`
- `client/src/api.ts` — `createTodo` / `updateTodo` 支持新字段（updateTodo 接受 null）
- `client/src/components/TodoForm.tsx` — 新建，复用新增 / 编辑两种模式
- `client/src/components/TodoInput.tsx` — 删除（被 TodoForm 替代）
- `client/src/components/TodoItem.tsx` — 重构两行视图 + editing 嵌 TodoForm
- `client/src/components/TodoList.tsx` — props 增加 onUpdate（替代 onToggle/onEdit）
- `client/src/pages/TodosPage.tsx` — 写操作后 refetch；用新 props 串起来

---

## Task 1: 后端类型扩展

**Files:**
- Modify: `server/src/types.ts`

- [ ] **Step 1: 扩展 Todo 与 input 类型**

替换 `server/src/types.ts` 第 1-16 行（保留下方 User / SessionData 部分）：

```ts
// 一条待办事项
export interface Todo {
  id: number;
  title: string;
  done: boolean;
  createdAt: string; // ISO 字符串
  category: string | null;
  priority: 1 | 2 | 3 | null;
  dueDate: string | null; // ISO YYYY-MM-DD
}

export interface CreateTodoInput {
  title: string;
  category?: string | null;
  priority?: 1 | 2 | 3 | null;
  dueDate?: string | null;
}

// PATCH 语义：undefined = 不动，null = 清空，具体值 = 更新
export interface UpdateTodoInput {
  title?: string;
  done?: boolean;
  category?: string | null;
  priority?: 1 | 2 | 3 | null;
  dueDate?: string | null;
}
```

- [ ] **Step 2: tsc 检查类型**

Run: `cd server && npx tsc --noEmit`
Expected: 编译会报多处错（services/todos.ts 的 rowToTodo 没填新字段、routes 也未传字段）。这些错在后续 task 修。**只看错误是否和预期一致**：错误集中在 `src/services/todos.ts` 的 `rowToTodo` 返回缺字段、`createTodo` 返回对象缺字段。其他地方无新错。

- [ ] **Step 3: 不 commit，留到 schema 修完一起**

跳过 commit。

---

## Task 2: 数据库 schema 迁移

**Files:**
- Modify: `server/src/db/schema.ts`
- Create: `server/tests/db.schema.test.ts`

- [ ] **Step 1: 写 schema 迁移测试**

新建 `server/tests/db.schema.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema';

interface ColumnInfo {
  name: string;
}

function listColumns(db: Database.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[]).map(
    (c) => c.name
  );
}

describe('schema initSchema', () => {
  it('新建库：todos 含 category/priority/due_date 三列', () => {
    const db = new Database(':memory:');
    initSchema(db);
    const cols = listColumns(db, 'todos');
    expect(cols).toContain('category');
    expect(cols).toContain('priority');
    expect(cols).toContain('due_date');
  });

  it('老库（无三列）：迁移后三列存在', () => {
    const db = new Database(':memory:');
    // 模拟阶段 2 的老 todos 表（无 category/priority/due_date）
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id)
      );
    `);
    initSchema(db);
    const cols = listColumns(db, 'todos');
    expect(cols).toContain('category');
    expect(cols).toContain('priority');
    expect(cols).toContain('due_date');
  });

  it('老库已有 todos 数据：迁移后数据保留', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id)
      );
      INSERT INTO users (username, password_hash, created_at)
        VALUES ('alice', 'h', '2026-06-13T00:00:00.000Z');
      INSERT INTO todos (title, done, created_at, user_id)
        VALUES ('老数据', 0, '2026-06-13T00:00:00.000Z', 1);
    `);
    initSchema(db);
    const rows = db.prepare(`SELECT title, category, priority, due_date FROM todos`).all() as Array<{
      title: string;
      category: string | null;
      priority: number | null;
      due_date: string | null;
    }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('老数据');
    expect(rows[0].category).toBeNull();
    expect(rows[0].priority).toBeNull();
    expect(rows[0].due_date).toBeNull();
  });
});
```

- [ ] **Step 2: 跑测试看它失败**

Run: `cd server && npx vitest run tests/db.schema.test.ts`
Expected: 3 个用例全失败（current schema 没有 category/priority/due_date 列）。

- [ ] **Step 3: 改 schema.ts 加迁移逻辑**

替换 `server/src/db/schema.ts` 全文：

```ts
import type Database from 'better-sqlite3';

interface ColumnInfo {
  name: string;
}

// 在传入的连接上建表（如不存在）
// 阶段 3：todos 加 category / priority / due_date 三列（全部 NULL 允许，老数据保留）
export function initSchema(db: Database.Database): void {
  // 1. users 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    NOT NULL
    );
  `);

  // 2. todos 表（新库直接含全部列）
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      category   TEXT,
      priority   INTEGER,
      due_date   TEXT
    );
  `);

  // 3. 阶段 1 老库迁移：若 todos 没有 user_id 列，则清空老数据再 ALTER
  const cols = db
    .prepare(`PRAGMA table_info(todos)`)
    .all() as ColumnInfo[];
  const colNames = cols.map((c) => c.name);
  const hasUserId = colNames.includes('user_id');
  if (!hasUserId) {
    db.exec(`DELETE FROM todos;`);
    db.exec(`ALTER TABLE todos ADD COLUMN user_id INTEGER NOT NULL REFERENCES users(id);`);
  }

  // 4. 阶段 3 老库迁移：缺哪列加哪列（保留数据）
  if (!colNames.includes('category')) {
    db.exec(`ALTER TABLE todos ADD COLUMN category TEXT;`);
  }
  if (!colNames.includes('priority')) {
    db.exec(`ALTER TABLE todos ADD COLUMN priority INTEGER;`);
  }
  if (!colNames.includes('due_date')) {
    db.exec(`ALTER TABLE todos ADD COLUMN due_date TEXT;`);
  }
}
```

- [ ] **Step 4: 跑 schema 测试通过**

Run: `cd server && npx vitest run tests/db.schema.test.ts`
Expected: 3 PASS。

- [ ] **Step 5: commit**

```bash
git add server/src/types.ts server/src/db/schema.ts server/tests/db.schema.test.ts
git commit -m "ch09 stage3: schema 加 category/priority/due_date 列 + 迁移"
```

---

## Task 3: services 创建支持新字段

**Files:**
- Modify: `server/src/services/todos.ts:1-46`
- Modify: `server/tests/services.todos.test.ts`

- [ ] **Step 1: 写"创建带三个新字段"测试**

在 `server/tests/services.todos.test.ts` 的 `describe('todos service', () => {` 内追加用例（放到现有用例之后、闭合 `})` 之前）：

```ts
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
```

- [ ] **Step 2: 跑测试看它失败**

Run: `cd server && npx vitest run tests/services.todos.test.ts -t "可带 category"`
Expected: FAIL — `t.category` undefined（service 还没读写新字段）。

- [ ] **Step 3: 改 services/todos.ts 的 rowToTodo / createTodo / getAllTodos**

替换 `server/src/services/todos.ts:1-46`：

```ts
import type Database from 'better-sqlite3';
import type { Todo, CreateTodoInput, UpdateTodoInput } from '../types';

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
    priority: row.priority === 1 || row.priority === 2 || row.priority === 3
      ? row.priority
      : null,
    dueDate: row.due_date,
  };
}

const SELECT_COLUMNS =
  'id, title, done, created_at, category, priority, due_date';

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
    priority: priority === 1 || priority === 2 || priority === 3 ? priority : null,
    dueDate,
  };
}

export function getAllTodos(db: Database.Database, userId: number): Todo[] {
  const rows = db
    .prepare(
      `SELECT ${SELECT_COLUMNS} FROM todos WHERE user_id = ? ` +
        `ORDER BY priority DESC NULLS LAST, due_date ASC NULLS LAST, id ASC`
    )
    .all(userId) as TodoRow[];
  return rows.map(rowToTodo);
}
```

（`updateTodo` / `deleteTodo` 保持原样不动，下个 task 改）

- [ ] **Step 4: 跑测试通过**

Run: `cd server && npx vitest run tests/services.todos.test.ts`
Expected: 旧 7 个 + 新 2 个 = 9 PASS。原有 update 测试可能因为 `existing.category` 字段缺失而失败 — 如果失败，看错误是否是 update 仍走老 SQL（`SELECT id, title, done, created_at`，缺新列导致后续失败）。如果是这种错误，跳到 Step 5；否则继续 Step 5。

- [ ] **Step 5: 修 updateTodo 中老 SELECT（最小改动让测试稳定）**

替换 `server/src/services/todos.ts` 中 `updateTodo` 函数：

```ts
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

  const nextTitle = input.title ?? existing.title;
  const nextDone = input.done === undefined ? existing.done : input.done ? 1 : 0;
  db.prepare(
    'UPDATE todos SET title = ?, done = ? WHERE id = ? AND user_id = ?'
  ).run(nextTitle, nextDone, id, userId);
  return rowToTodo({ ...existing, title: nextTitle, done: nextDone });
}
```

- [ ] **Step 6: 跑测试全部通过**

Run: `cd server && npx vitest run tests/services.todos.test.ts`
Expected: 9 PASS。

- [ ] **Step 7: commit**

```bash
git add server/src/services/todos.ts server/tests/services.todos.test.ts
git commit -m "ch09 stage3: services.todos 创建/查询支持新字段 + 排序"
```

---

## Task 4: services 排序与 update 清空字段

**Files:**
- Modify: `server/src/services/todos.ts`（updateTodo 函数）
- Modify: `server/tests/services.todos.test.ts`

- [ ] **Step 1: 写排序与 update null 清空测试**

在 `server/tests/services.todos.test.ts` 的 describe 块尾部追加：

```ts
  it('排序：priority DESC NULLS LAST，同优先级按 dueDate ASC NULLS LAST', () => {
    const { db, aliceId } = bootstrap();
    // 故意打乱创建顺序
    createTodo(db, aliceId, { title: 'A 中无日期' });
    createTodo(db, aliceId, { title: 'B 高 早' });
    createTodo(db, aliceId, { title: 'C 高 晚' });
    createTodo(db, aliceId, { title: 'D 低 早' });
    createTodo(db, aliceId, { title: 'E 中 中' });
    // 用 update 后续修改字段（避免依赖 update 还没改完——这里只测排序，先各自 update 一遍）
    const all1 = getAllTodos(db, aliceId);
    updateTodo(db, aliceId, all1[0].id, { priority: null }); // A 中无日期 → 暂设 null priority
    // 重写一遍想要的最终状态：用 deleteAll + 重建
    db.prepare('DELETE FROM todos WHERE user_id = ?').run(aliceId);

    createTodo(db, aliceId, { title: 'B 高 早', priority: 3, dueDate: '2026-06-15' });
    createTodo(db, aliceId, { title: 'C 高 晚', priority: 3, dueDate: '2026-06-20' });
    createTodo(db, aliceId, { title: 'E 中 中', priority: 2, dueDate: '2026-06-18' });
    createTodo(db, aliceId, { title: 'D 低 早', priority: 1, dueDate: '2026-06-15' });
    createTodo(db, aliceId, { title: 'A 中无日期', priority: 2 });
    createTodo(db, aliceId, { title: 'F 全空' });

    const titles = getAllTodos(db, aliceId).map((t) => t.title);
    expect(titles).toEqual([
      'B 高 早',     // priority 3, 06-15
      'C 高 晚',     // priority 3, 06-20
      'E 中 中',     // priority 2, 06-18
      'A 中无日期',  // priority 2, no date → 同 priority 内，无日期排后
      'D 低 早',     // priority 1, 06-15
      'F 全空',      // priority null → 沉底
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
```

- [ ] **Step 2: 跑测试看排序通过、update 部分失败**

Run: `cd server && npx vitest run tests/services.todos.test.ts`
Expected: 排序用例 PASS（Task 3 已经改了 ORDER BY）；后两个 update 用例 FAIL（updateTodo 只处理 title/done，没处理新字段）。

- [ ] **Step 3: 改 updateTodo 支持新字段（含 null 清空）**

替换 `server/src/services/todos.ts` 中的 `updateTodo`：

```ts
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
```

- [ ] **Step 4: 跑测试全部通过**

Run: `cd server && npx vitest run tests/services.todos.test.ts`
Expected: 12 PASS（原 7 + Task 3 加 2 + 本 task 加 3）。

- [ ] **Step 5: commit**

```bash
git add server/src/services/todos.ts server/tests/services.todos.test.ts
git commit -m "ch09 stage3: services.todos.update 支持 null 清空 + 排序断言"
```

---

## Task 5: routes 校验新字段

**Files:**
- Modify: `server/src/routes/todos.ts`
- Modify: `server/tests/routes.todos.test.ts`

- [ ] **Step 1: 写 routes 测试**

在 `server/tests/routes.todos.test.ts` 的 describe 末尾追加：

```ts
  it('POST /api/todos 含新字段 → 201', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent.post('/api/todos').send({
      title: '写课件',
      category: '工作',
      priority: 3,
      dueDate: '2026-06-20',
    });
    expect(res.status).toBe(201);
    expect(res.body.category).toBe('工作');
    expect(res.body.priority).toBe(3);
    expect(res.body.dueDate).toBe('2026-06-20');
  });

  it('POST /api/todos priority 非 1/2/3 → 400', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent
      .post('/api/todos')
      .send({ title: 'x', priority: 5 });
    expect(res.status).toBe(400);
  });

  it('POST /api/todos dueDate 非 ISO → 400', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent
      .post('/api/todos')
      .send({ title: 'x', dueDate: '2026/06/20' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/todos/:id 用 null 清空字段', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const created = await agent.post('/api/todos').send({
      title: 'x',
      category: '工作',
      priority: 3,
      dueDate: '2026-06-20',
    });
    const id = created.body.id;
    const res = await agent
      .patch(`/api/todos/${id}`)
      .send({ category: null, priority: null, dueDate: null });
    expect(res.status).toBe(200);
    expect(res.body.category).toBeNull();
    expect(res.body.priority).toBeNull();
    expect(res.body.dueDate).toBeNull();
  });
```

- [ ] **Step 2: 跑测试看它失败**

Run: `cd server && npx vitest run tests/routes.todos.test.ts`
Expected: 4 个新用例 FAIL（routes 还没读 / 校验新字段）。

- [ ] **Step 3: 改 routes/todos.ts**

替换 `server/src/routes/todos.ts` 全文：

```ts
import { Router, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import {
  createTodo,
  getAllTodos,
  updateTodo,
  deleteTodo,
} from '../services/todos';

// 此处假定上游已经过 requireAuth 中间件，session.userId 一定存在
function userId(req: Request): number {
  return req.session.userId as number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// 校验 priority：允许 undefined（不传）/ null（清空）/ 1|2|3
// 返回 { ok: true, value } 或 { ok: false }
type Validated<T> = { ok: true; value: T } | { ok: false };

function validatePriority(v: unknown): Validated<1 | 2 | 3 | null | undefined> {
  if (v === undefined) return { ok: true, value: undefined };
  if (v === null) return { ok: true, value: null };
  if (v === 1 || v === 2 || v === 3) return { ok: true, value: v };
  return { ok: false };
}

function validateDueDate(v: unknown): Validated<string | null | undefined> {
  if (v === undefined) return { ok: true, value: undefined };
  if (v === null) return { ok: true, value: null };
  if (typeof v === 'string' && ISO_DATE.test(v)) return { ok: true, value: v };
  return { ok: false };
}

function validateCategory(v: unknown): Validated<string | null | undefined> {
  if (v === undefined) return { ok: true, value: undefined };
  if (v === null) return { ok: true, value: null };
  if (typeof v === 'string') return { ok: true, value: v };
  return { ok: false };
}

export function createTodosRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    res.json(getAllTodos(db, userId(req)));
  });

  router.post('/', (req: Request, res: Response) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title) {
      res.status(400).json({ error: 'title 必填' });
      return;
    }
    const cat = validateCategory(req.body?.category);
    const pri = validatePriority(req.body?.priority);
    const due = validateDueDate(req.body?.dueDate);
    if (!cat.ok) {
      res.status(400).json({ error: 'category 非法' });
      return;
    }
    if (!pri.ok) {
      res.status(400).json({ error: 'priority 必须是 1/2/3' });
      return;
    }
    if (!due.ok) {
      res.status(400).json({ error: 'dueDate 必须是 YYYY-MM-DD' });
      return;
    }
    const todo = createTodo(db, userId(req), {
      title,
      category: cat.value,
      priority: pri.value,
      dueDate: due.value,
    });
    res.status(201).json(todo);
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'id 非法' });
      return;
    }
    const body = req.body ?? {};
    const cat = validateCategory(body.category);
    const pri = validatePriority(body.priority);
    const due = validateDueDate(body.dueDate);
    if (!cat.ok) {
      res.status(400).json({ error: 'category 非法' });
      return;
    }
    if (!pri.ok) {
      res.status(400).json({ error: 'priority 必须是 1/2/3' });
      return;
    }
    if (!due.ok) {
      res.status(400).json({ error: 'dueDate 必须是 YYYY-MM-DD' });
      return;
    }

    const updated = updateTodo(db, userId(req), id, {
      title: typeof body.title === 'string' ? body.title : undefined,
      done: typeof body.done === 'boolean' ? body.done : undefined,
      category: cat.value,
      priority: pri.value,
      dueDate: due.value,
    });
    if (!updated) {
      res.status(404).json({ error: '未找到' });
      return;
    }
    res.json(updated);
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'id 非法' });
      return;
    }
    const ok = deleteTodo(db, userId(req), id);
    if (!ok) {
      res.status(404).json({ error: '未找到' });
      return;
    }
    res.status(204).end();
  });

  return router;
}
```

- [ ] **Step 4: 跑后端全量测试**

Run: `cd server && npm test`
Expected: 全绿（约 31 + 5 + 4 + 3 = 43 用例左右）。如果有失败，定位并修复后重跑。

- [ ] **Step 5: commit**

```bash
git add server/src/routes/todos.ts server/tests/routes.todos.test.ts
git commit -m "ch09 stage3: routes.todos POST/PATCH 校验新字段"
```

---

## Task 6: 前端 types 与 api

**Files:**
- Modify: `client/src/types.ts`
- Modify: `client/src/api.ts:43-54`

- [ ] **Step 1: 扩展 Todo 类型**

替换 `client/src/types.ts` 第 1-7 行：

```ts
export interface Todo {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
  category: string | null;
  priority: 1 | 2 | 3 | null;
  dueDate: string | null;
}
```

- [ ] **Step 2: 改 createTodo / updateTodo 支持新字段**

替换 `client/src/api.ts:33-54`（即 `createTodo` 和 `updateTodo` 两个函数）：

```ts
export async function createTodo(input: {
  title: string;
  category?: string | null;
  priority?: 1 | 2 | 3 | null;
  dueDate?: string | null;
}): Promise<Todo> {
  return handle<Todo>(
    await authedFetch(TODOS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  );
}

export type UpdateTodoPatch = {
  title?: string;
  done?: boolean;
  category?: string | null;
  priority?: 1 | 2 | 3 | null;
  dueDate?: string | null;
};

export async function updateTodo(id: number, patch: UpdateTodoPatch): Promise<Todo> {
  return handle<Todo>(
    await authedFetch(`${TODOS}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  );
}
```

- [ ] **Step 3: tsc 检查**

Run: `cd client && npx tsc --noEmit`
Expected: 报多处错（`TodosPage` 调用 `api.createTodo(title)` 改成对象后签名不符；`TodoItem` 等组件没有新字段也没有错误）。这些错在后续 task 修。**只确认错误是否集中在 `pages/TodosPage.tsx` 的 `api.createTodo` 调用**，不要继续修其他文件。

- [ ] **Step 4: 不 commit，留到 TodosPage 改完一起**

跳过 commit。

---

## Task 7: 前端 TodoForm 组件

**Files:**
- Create: `client/src/components/TodoForm.tsx`
- Delete (later in this task): `client/src/components/TodoInput.tsx`

- [ ] **Step 1: 写 TodoForm 组件**

新建 `client/src/components/TodoForm.tsx`：

```tsx
import { useState, type FormEvent } from 'react';
import type { Todo } from '../types';

export interface TodoFormValues {
  title: string;
  category: string | null;
  priority: 1 | 2 | 3 | null;
  dueDate: string | null;
}

interface Props {
  initial?: Partial<Todo>;
  submitText: string;
  onSubmit: (values: TodoFormValues) => void;
  onCancel?: () => void;
}

// 同时支持新增和编辑两种模式
export function TodoForm({ initial, submitText, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [priority, setPriority] = useState<'' | '1' | '2' | '3'>(
    initial?.priority ? (String(initial.priority) as '1' | '2' | '3') : ''
  );
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onSubmit({
      title: t,
      category: category.trim() ? category.trim() : null,
      priority: priority === '' ? null : (Number(priority) as 1 | 2 | 3),
      dueDate: dueDate ? dueDate : null,
    });
    if (!initial) {
      // 新增模式提交后清空
      setTitle('');
      setCategory('');
      setPriority('');
      setDueDate('');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-2">
      <input
        className="border rounded px-3 py-2"
        placeholder="想做点什么..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus={!!initial}
      />
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="分类（可选）"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <select
          className="border rounded px-2 py-2"
          value={priority}
          onChange={(e) => setPriority(e.target.value as '' | '1' | '2' | '3')}
        >
          <option value="">优先级</option>
          <option value="1">低</option>
          <option value="2">中</option>
          <option value="3">高</option>
        </select>
        <input
          type="date"
          className="border rounded px-2 py-2"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {submitText}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded border hover:bg-gray-100"
          >
            取消
          </button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 2: 删除旧 TodoInput.tsx**

```bash
rm client/src/components/TodoInput.tsx
```

- [ ] **Step 3: tsc 检查**

Run: `cd client && npx tsc --noEmit`
Expected: 报错—— `TodosPage.tsx` import `TodoInput` 不再存在。这个在 Task 9 一起修。

- [ ] **Step 4: 不 commit，留到 TodosPage 一起**

跳过 commit。

---

## Task 8: 前端 TodoItem 重构

**Files:**
- Modify: `client/src/components/TodoItem.tsx`

- [ ] **Step 1: 重写 TodoItem**

替换 `client/src/components/TodoItem.tsx` 全文：

```tsx
import { useState } from 'react';
import type { Todo } from '../types';
import { TodoForm, type TodoFormValues } from './TodoForm';

interface Props {
  todo: Todo;
  onToggle: (id: number, done: boolean) => void;
  onUpdate: (id: number, patch: TodoFormValues) => void;
  onDelete: (id: number) => void;
}

const PRIORITY_EMOJI: Record<1 | 2 | 3, string> = {
  1: '🟢',
  2: '🟡',
  3: '🔴',
};

function isOverdue(dueDate: string | null, done: boolean): boolean {
  if (!dueDate || done) return false;
  // YYYY-MM-DD 字符串比较即可（和 today 的同格式串比较）
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  return dueDate < todayStr;
}

export function TodoItem({ todo, onToggle, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="py-2 border-b last:border-b-0">
        <TodoForm
          initial={todo}
          submitText="保存"
          onSubmit={(values) => {
            onUpdate(todo.id, values);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  const overdue = isOverdue(todo.dueDate, todo.done);
  const showMeta = todo.category || todo.dueDate;

  return (
    <li className="py-2 border-b last:border-b-0">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={todo.done}
          onChange={(e) => onToggle(todo.id, e.target.checked)}
        />
        <span
          className={`flex-1 ${todo.done ? 'line-through text-gray-400' : ''}`}
        >
          {todo.title}
        </span>
        {todo.priority && (
          <span title={`优先级 ${todo.priority}`}>
            {PRIORITY_EMOJI[todo.priority]}
          </span>
        )}
        <button
          className="text-sm text-gray-500 hover:text-gray-800"
          onClick={() => setEditing(true)}
        >
          编辑
        </button>
        <button
          className="text-sm text-red-500 hover:text-red-700"
          onClick={() => onDelete(todo.id)}
        >
          删除
        </button>
      </div>
      {showMeta && (
        <div className="flex items-center gap-2 pl-6 mt-1 text-xs">
          {todo.category && (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {todo.category}
            </span>
          )}
          {todo.dueDate && (
            <span className={overdue ? 'text-red-500' : 'text-gray-500'}>
              ⏰ {todo.dueDate}
            </span>
          )}
        </div>
      )}
    </li>
  );
}
```

- [ ] **Step 2: tsc 检查**

Run: `cd client && npx tsc --noEmit`
Expected: 报错——`TodoList` 还是用 `onEdit` 旧 props，`TodosPage` 也是。下个 task 修。

- [ ] **Step 3: 不 commit**

跳过。

---

## Task 9: 前端 TodoList 与 TodosPage 接通

**Files:**
- Modify: `client/src/components/TodoList.tsx`
- Modify: `client/src/pages/TodosPage.tsx`

- [ ] **Step 1: 改 TodoList props**

替换 `client/src/components/TodoList.tsx` 全文：

```tsx
import type { Todo } from '../types';
import { TodoItem } from './TodoItem';
import type { TodoFormValues } from './TodoForm';

interface Props {
  todos: Todo[];
  onToggle: (id: number, done: boolean) => void;
  onUpdate: (id: number, patch: TodoFormValues) => void;
  onDelete: (id: number) => void;
}

export function TodoList({ todos, onToggle, onUpdate, onDelete }: Props) {
  if (todos.length === 0) {
    return <p className="text-gray-400 text-center py-8">还没有待办</p>;
  }
  return (
    <ul>
      {todos.map((t) => (
        <TodoItem
          key={t.id}
          todo={t}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: 改 TodosPage**

替换 `client/src/pages/TodosPage.tsx` 全文：

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Todo } from '../types';
import * as api from '../api';
import { useAuth } from '../auth/AuthContext';
import { TodoForm, type TodoFormValues } from '../components/TodoForm';
import { TodoList } from '../components/TodoList';

export default function TodosPage() {
  const { user, logout } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // 写操作完成后刷新整个列表，保证排序与最新值一致
  async function refetch() {
    try {
      const list = await api.fetchTodos();
      setTodos(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    refetch();
  }, []);

  async function handleAdd(values: TodoFormValues) {
    try {
      await api.createTodo(values);
      await refetch();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleToggle(id: number, done: boolean) {
    try {
      await api.updateTodo(id, { done });
      await refetch();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUpdate(id: number, patch: TodoFormValues) {
    try {
      await api.updateTodo(id, patch);
      await refetch();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteTodo(id);
      await refetch();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-xl mx-auto bg-white rounded shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">TODO List</h1>
          <div className="text-sm">
            <span className="text-gray-500 mr-2">你好，{user?.username}</span>
            <button
              className="text-red-500 hover:text-red-700"
              onClick={handleLogout}
            >
              退出
            </button>
          </div>
        </div>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <TodoForm submitText="添加" onSubmit={handleAdd} />
        <TodoList
          todos={todos}
          onToggle={handleToggle}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: tsc 与 build 通过**

Run: `cd client && npx tsc --noEmit && npm run build`
Expected: 都通过。如有报错，逐条修。

- [ ] **Step 4: commit 前端整体**

```bash
git add client/src/types.ts client/src/api.ts \
  client/src/components/TodoForm.tsx \
  client/src/components/TodoItem.tsx \
  client/src/components/TodoList.tsx \
  client/src/pages/TodosPage.tsx
git rm client/src/components/TodoInput.tsx
git commit -m "ch09 stage3: 前端加 TodoForm + TodoItem 两行视图 + 写操作 refetch"
```

---

## Task 10: 手动 smoke + 收尾

**Files:**
- Modify: `ch09_rebuild_todolist/README.md`

- [ ] **Step 1: 起后端**

Run: `cd server && rm -f data.db && npm run dev`（后台或新终端）
Expected: 监听 3001。

- [ ] **Step 2: 起前端**

Run: `cd client && npm run dev`
Expected: 监听 5173。

- [ ] **Step 3: 浏览器手动验证**

用浏览器打开 http://localhost:5173 ：
1. 注册一个新账号 `alice`
2. 添加一条只有标题的："看书"
3. 添加一条带分类 + 优先级 + 截止日期：title="写课件" category="工作" priority=高 dueDate=2026-06-20
4. 添加一条仅高优先级 + 早日期：title="买菜" priority=高 dueDate=2026-06-15
5. 列表顺序应为：买菜（高 06-15）→ 写课件（高 06-20）→ 看书（无优先级，沉底）
6. 点"看书"的"编辑"，整行变表单，加上 priority=低 后保存 → 列表刷新
7. 把买菜的截止日期改成 2025-12-01（已过去），副行 ⏰ 字段应红色
8. 点删除某条 → 列表刷新

如有界面 bug（错位、字段没回显等）现场修后回到 Step 1 重起。

- [ ] **Step 4: 关闭服务**

```bash
# 停掉两个 dev server（Ctrl+C 或 kill 后台进程）
```

- [ ] **Step 5: 跑后端全量测试再确认**

Run: `cd server && npm test`
Expected: 全绿。

- [ ] **Step 6: 更新 README 阶段进度表**

把 `ch09_rebuild_todolist/README.md` 中的阶段 3 行替换为：

```markdown
| 3 | 分类 + 优先级 + 截止日期 | ✅ 完成 | [link](docs/superpowers/specs/2026-06-13-stage3-fields-design.md) | [link](docs/superpowers/plans/2026-06-13-stage3-fields-plan.md) |
```

- [ ] **Step 7: commit**

```bash
git add ch09_rebuild_todolist/README.md
git commit -m "ch09 stage3: README 阶段进度更新到完成"
```

---

## Self-Review

**Spec coverage:**
- 数据模型三列 + 全部 NULL 允许 → Task 2 ✅
- PRAGMA + ALTER 迁移、保留老数据 → Task 2 ✅
- 字段值校验（priority ∈ 1/2/3、dueDate ISO） → Task 5 ✅
- POST/PATCH 新字段 + null 清空语义 → Task 4 (service)、Task 5 (route) ✅
- GET 排序 priority DESC NULLS LAST + due_date ASC NULLS LAST + id ASC → Task 3 ✅
- Todo 类型前后端统一 → Task 1（后端）+ Task 6（前端）✅
- TodoForm 复用新增/编辑 → Task 7 ✅
- TodoItem 两行视图 + editing → Task 8 ✅
- 优先级 emoji 1/2/3=🟢/🟡/🔴、分类药丸、过期红色 → Task 8 ✅
- 写操作后 refetch → Task 9 ✅
- 后端测试 +5 service / +4 route / +3 schema → Task 2/3/4/5 ✅

**Placeholder scan:** 无 TBD/TODO/省略；所有代码块完整。

**Type consistency:** `TodoFormValues` 在 Task 7 定义，Task 8/9 复用导入；`UpdateTodoPatch` 在 Task 6 定义但 TodosPage 没直接用类型（直接传对象）— OK；`PRIORITY_EMOJI` 仅在 Task 8 内部使用 — OK。`SELECT_COLUMNS` 常量在 Task 3 引入并在 Task 4 复用 — 一致。
