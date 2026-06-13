# ch08 阶段 2（登录 + 用户隔离）实现 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在阶段 1 MVP 之上加入注册 / 登录 / 退出，并把 todos 按 `user_id` 隔离。

**Architecture:** 后端用 `express-session` + `better-sqlite3-session-store` 持 cookie session；新增 `users` 表 + bcrypt 哈希；`todos` ALTER 加 `user_id` 列（先清掉阶段 1 老数据）。前端引入 React Router，两个路由 `/login` 和 `/`，加 `AuthContext` + `RequireAuth` 路由守卫。所有 fetch 全局 `credentials: 'include'`。

**Tech Stack:** express-session, better-sqlite3-session-store, bcryptjs, react-router-dom v6, supertest agent。

**Spec：** `docs/superpowers/specs/2026-06-13-stage2-auth-design.md`

**完成定义（DoD）：**
- 后端 `npm test` 全绿（30 条用例）
- 浏览器中能：注册 alice → 加 todo → 退出；注册 bob → 加 todo → 看不到 alice 的；刷新仍登录；退出后跳 `/login`
- README 阶段进度表把阶段 2 标 ✅
- 阶段 2 design + plan 已 commit

---

## 文件结构（阶段 2 结束后）

```
ch08_rebuild_todolist/
├── README.md                                  # 改：阶段 2 标 ✅，加 spec/plan 链接
├── docs/superpowers/
│   ├── specs/2026-06-13-stage2-auth-design.md  (已存在)
│   └── plans/2026-06-13-stage2-auth-plan.md    (本文件)
├── server/
│   ├── package.json                            # 改：加 4 个 dep + 4 个 devDep
│   ├── src/
│   │   ├── app.ts                              # 改：cors credentials + session + auth 路由 + requireAuth
│   │   ├── index.ts                            # 不动
│   │   ├── types.ts                            # 改：加 User / CreateUserInput / declare SessionData.userId
│   │   ├── db/
│   │   │   ├── connection.ts                   # 不动
│   │   │   └── schema.ts                       # 改：建 users 表 + ALTER todos 加 user_id（先 DELETE 老数据）
│   │   ├── middleware/
│   │   │   └── requireAuth.ts                  # 新
│   │   ├── services/
│   │   │   ├── users.ts                        # 新
│   │   │   └── todos.ts                        # 改：每个函数加 userId 参数
│   │   └── routes/
│   │       ├── auth.ts                         # 新：4 个 endpoints
│   │       └── todos.ts                        # 改：从 req.session.userId 取 userId 传给 service
│   └── tests/
│       ├── setup.ts                            # 不动
│       ├── services.users.test.ts              # 新
│       ├── services.todos.test.ts              # 改：所有调用加 userId 参数 + 跨用户用例
│       ├── routes.auth.test.ts                 # 新
│       └── routes.todos.test.ts                # 改：用 supertest agent 持 cookie + 401/404 用例
└── client/
    ├── package.json                            # 改：加 react-router-dom
    └── src/
        ├── main.tsx                            # 改：包 BrowserRouter + AuthProvider
        ├── App.tsx                             # 改：路由分发
        ├── auth/
        │   ├── AuthContext.tsx                 # 新
        │   └── RequireAuth.tsx                 # 新
        ├── pages/
        │   ├── LoginPage.tsx                   # 新
        │   └── TodosPage.tsx                   # 新（阶段 1 App.tsx 内容平移）
        ├── components/                         # 不动
        ├── api.ts                              # 改：authedFetch + 4 个 auth 函数
        └── types.ts                            # 改：加 User
```

---

## 任务概览

| # | 任务 | 输出 |
|---|---|---|
| 1 | 后端装新依赖 + 改 schema 演进 | `npm install` 通过；`npm test` 全绿 |
| 2 | services/users（TDD） | 5 条 users service 用例 |
| 3 | services/todos 改造加 userId（TDD） | 7 条 todos service 用例（含跨用户） |
| 4 | requireAuth 中间件 + session 类型 | 装好基建 |
| 5 | routes/auth（TDD via supertest agent） | 9 条 auth route 用例 |
| 6 | routes/todos 改造（TDD via supertest agent） | 9 条 todos route 用例（含 401/404） |
| 7 | app.ts 装配（cors credentials + session + auth + requireAuth） | 30 条全绿 |
| 8 | 前端引 react-router-dom + 拆 main/App | 路由就绪 |
| 9 | 前端 api.ts 加 authedFetch + auth 函数 | 模块就绪 |
| 10 | AuthContext + RequireAuth | hook 就绪 |
| 11 | LoginPage + TodosPage | 端到端跑通 |
| 12 | README 阶段进度表 + commit | 阶段 2 收尾 |

---

## Task 1：后端装新依赖 + 改 schema 演进

**Files:**
- Modify: `ch08_rebuild_todolist/server/package.json`（通过 `npm i`）
- Modify: `ch08_rebuild_todolist/server/src/types.ts`
- Modify: `ch08_rebuild_todolist/server/src/db/schema.ts`

- [ ] **Step 1：装依赖**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/server
npm i bcryptjs express-session better-sqlite3-session-store
npm i -D @types/bcryptjs @types/express-session
```

- [ ] **Step 2：改 `server/src/types.ts`，覆盖为下面内容**

```ts
// 一条待办事项
export interface Todo {
  id: number;
  title: string;
  done: boolean;
  createdAt: string; // ISO 字符串
}

export interface CreateTodoInput {
  title: string;
}

export interface UpdateTodoInput {
  title?: string;
  done?: boolean;
}

// 用户（不含密码哈希）
export interface User {
  id: number;
  username: string;
  createdAt: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
}

// 扩展 express-session：在 session 中存当前登录用户的 id
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}
```

- [ ] **Step 3：改 `server/src/db/schema.ts`，覆盖为下面内容**

```ts
import type Database from 'better-sqlite3';

interface ColumnInfo {
  name: string;
}

// 在传入的连接上建表（如不存在）
// 阶段 2：新增 users 表；todos 加 user_id 列。若旧库不含 user_id，先清空 todos 再 ALTER。
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

  // 2. todos 表（新库直接含 user_id）
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      user_id    INTEGER NOT NULL REFERENCES users(id)
    );
  `);

  // 3. 阶段 1 老库迁移：若 todos 没有 user_id 列，则清空老数据再 ALTER
  const cols = db
    .prepare(`PRAGMA table_info(todos)`)
    .all() as ColumnInfo[];
  const hasUserId = cols.some((c) => c.name === 'user_id');
  if (!hasUserId) {
    db.exec(`DELETE FROM todos;`);
    db.exec(`ALTER TABLE todos ADD COLUMN user_id INTEGER NOT NULL REFERENCES users(id);`);
  }
}
```

- [ ] **Step 4：跑现有测试，确认仍能通过编译（services.todos / routes.todos 暂时还会失败，因为它们还没改造）**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/server
npx tsc --noEmit
```

期望：tsc 无错误（schema.ts、types.ts 编得过）。

> 注：现在还没跑 `npm test`，因为 services/todos 仍是阶段 1 版本（不带 userId），新 schema 会让它的 `INSERT` 报 `NOT NULL constraint failed: todos.user_id`。Task 3 会修。

- [ ] **Step 5：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/package.json ch08_rebuild_todolist/server/package-lock.json ch08_rebuild_todolist/server/src/types.ts ch08_rebuild_todolist/server/src/db/schema.ts
git commit -m "ch08 stage2: 装鉴权依赖 + schema 加 users 表与 todos.user_id"
```

---

## Task 2：services/users（TDD）

**Files:**
- Create: `ch08_rebuild_todolist/server/tests/services.users.test.ts`
- Create: `ch08_rebuild_todolist/server/src/services/users.ts`

- [ ] **Step 1：写失败测试 `server/tests/services.users.test.ts`**

```ts
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
```

- [ ] **Step 2：跑测试，确认「红」**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/server
npm test
```

期望：`Cannot find module '../src/services/users'`。

- [ ] **Step 3：写实现 `server/src/services/users.ts`**

```ts
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
```

- [ ] **Step 4：跑测试，确认「绿」**

```bash
npm test
```

期望：services.users 全部 6 passed。
（services.todos 与 routes.todos 仍可能因 schema 变动而失败，那是 Task 3/Task 6 的活，先忽略。）

- [ ] **Step 5：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/src/services/users.ts ch08_rebuild_todolist/server/tests/services.users.test.ts
git commit -m "ch08 stage2: services/users（createUser / getUserByName / verifyPassword）"
```

---

## Task 3：services/todos 改造加 userId（TDD）

**Files:**
- Modify: `ch08_rebuild_todolist/server/src/services/todos.ts`
- Modify: `ch08_rebuild_todolist/server/tests/services.todos.test.ts`

- [ ] **Step 1：替换 `server/tests/services.todos.test.ts` 全文**

```ts
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
});
```

- [ ] **Step 2：跑测试，确认「红」**

```bash
npm test
```

期望：todos service 测试全部失败（参数 mismatch + tsc 报错）。

- [ ] **Step 3：替换 `server/src/services/todos.ts` 全文**

```ts
import type Database from 'better-sqlite3';
import type { Todo, CreateTodoInput, UpdateTodoInput } from '../types';

interface TodoRow {
  id: number;
  title: string;
  done: number;
  created_at: string;
}

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    done: row.done === 1,
    createdAt: row.created_at,
  };
}

export function createTodo(
  db: Database.Database,
  userId: number,
  input: CreateTodoInput
): Todo {
  const createdAt = new Date().toISOString();
  const info = db
    .prepare(
      'INSERT INTO todos (title, done, created_at, user_id) VALUES (?, 0, ?, ?)'
    )
    .run(input.title, createdAt, userId);
  return {
    id: Number(info.lastInsertRowid),
    title: input.title,
    done: false,
    createdAt,
  };
}

export function getAllTodos(db: Database.Database, userId: number): Todo[] {
  const rows = db
    .prepare(
      'SELECT id, title, done, created_at FROM todos WHERE user_id = ? ORDER BY id ASC'
    )
    .all(userId) as TodoRow[];
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
      'SELECT id, title, done, created_at FROM todos WHERE id = ? AND user_id = ?'
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
```

- [ ] **Step 4：跑测试，确认「绿」**

```bash
npm test
```

期望：services.todos 全部 7 passed；services.users 仍 6 passed。
（routes.todos 仍会失败，Task 6 修。）

- [ ] **Step 5：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/src/services/todos.ts ch08_rebuild_todolist/server/tests/services.todos.test.ts
git commit -m "ch08 stage2: services/todos 加 userId 隔离"
```

---

## Task 4：requireAuth 中间件

**Files:**
- Create: `ch08_rebuild_todolist/server/src/middleware/requireAuth.ts`

- [ ] **Step 1：创建目录**

```bash
mkdir -p /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/server/src/middleware
```

- [ ] **Step 2：写 `server/src/middleware/requireAuth.ts`**

```ts
import type { Request, Response, NextFunction } from 'express';

// 受保护接口的看门人：未登录返回 401
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: '请先登录' });
    return;
  }
  next();
}
```

- [ ] **Step 3：tsc 编译检查**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/server
npx tsc --noEmit
```

期望：无错误（依赖 types.ts 里的 SessionData.userId 类型扩展）。

- [ ] **Step 4：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/src/middleware/requireAuth.ts
git commit -m "ch08 stage2: requireAuth 中间件"
```

---

## Task 5：routes/auth + 其测试（TDD via supertest agent）

**Files:**
- Create: `ch08_rebuild_todolist/server/src/routes/auth.ts`
- Create: `ch08_rebuild_todolist/server/tests/routes.auth.test.ts`

> 这一步要先动 `app.ts` 装上 session 与 auth 路由，否则 supertest 跑不通。我们这里用一个**临时的 createApp 改造**先支撑测试，正式装配收尾在 Task 7。

- [ ] **Step 1：先把 `server/src/app.ts` 改成下面这版（含 session + auth + requireAuth + todos）**

```ts
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import sqliteStoreFactory from 'better-sqlite3-session-store';
import type Database from 'better-sqlite3';
import { createTodosRouter } from './routes/todos';
import { createAuthRouter } from './routes/auth';
import { requireAuth } from './middleware/requireAuth';

const SqliteStore = sqliteStoreFactory(session);

// 注入 db 便于测试时使用内存连接
export function createApp(db: Database.Database) {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json());

  app.use(
    session({
      store: new SqliteStore({
        client: db,
        expired: { clear: true, intervalMs: 15 * 60 * 1000 },
      }),
      secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/todos', requireAuth, createTodosRouter(db));

  return app;
}
```

- [ ] **Step 2：写失败测试 `server/tests/routes.auth.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestDb } from './setup';
import { createApp } from '../src/app';

function newApp() {
  return createApp(createTestDb());
}

describe('auth routes', () => {
  it('POST /api/auth/register 成功 201 并写入 session', async () => {
    const agent = request.agent(newApp());
    const res = await agent
      .post('/api/auth/register')
      .send({ username: 'alice', password: 'pw' });
    expect(res.status).toBe(201);
    expect(res.body.username).toBe('alice');
    expect(res.body.id).toBeGreaterThan(0);

    // 注册后立即可用 session 调 /me
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.username).toBe('alice');
  });

  it('POST /api/auth/register 用户名重复 409', async () => {
    const app = newApp();
    await request(app).post('/api/auth/register').send({ username: 'a', password: 'p' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'a', password: 'p2' });
    expect(res.status).toBe(409);
  });

  it('POST /api/auth/register 缺字段 400', async () => {
    const res = await request(newApp())
      .post('/api/auth/register')
      .send({ username: 'a' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login 成功 200', async () => {
    const app = newApp();
    await request(app).post('/api/auth/register').send({ username: 'a', password: 'p' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'a', password: 'p' });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('a');
  });

  it('POST /api/auth/login 密码错 401', async () => {
    const app = newApp();
    await request(app).post('/api/auth/register').send({ username: 'a', password: 'p' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'a', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login 账号不存在 401', async () => {
    const res = await request(newApp())
      .post('/api/auth/login')
      .send({ username: 'ghost', password: 'p' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/logout 返回 204 并清掉 session', async () => {
    const agent = request.agent(newApp());
    await agent.post('/api/auth/register').send({ username: 'a', password: 'p' });
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(204);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });

  it('GET /api/auth/me 未登录 401', async () => {
    const res = await request(newApp()).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me 已登录 200', async () => {
    const agent = request.agent(newApp());
    await agent.post('/api/auth/register').send({ username: 'a', password: 'p' });
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('a');
  });
});
```

- [ ] **Step 3：跑测试，确认「红」**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/server
npm test
```

期望：找不到 `../src/routes/auth`。

- [ ] **Step 4：写 `server/src/routes/auth.ts`**

```ts
import { Router, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import {
  createUser,
  getUserByName,
  getUserById,
  verifyPassword,
} from '../services/users';

function readCredentials(req: Request): { username: string; password: string } | null {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!username || !password) return null;
  return { username, password };
}

export function createAuthRouter(db: Database.Database): Router {
  const router = Router();

  router.post('/register', (req: Request, res: Response) => {
    const creds = readCredentials(req);
    if (!creds) {
      res.status(400).json({ error: 'username 与 password 必填' });
      return;
    }
    if (getUserByName(db, creds.username)) {
      res.status(409).json({ error: '用户名已被占用' });
      return;
    }
    const user = createUser(db, creds);
    req.session.userId = user.id;
    res.status(201).json(user);
  });

  router.post('/login', (req: Request, res: Response) => {
    const creds = readCredentials(req);
    if (!creds) {
      res.status(400).json({ error: 'username 与 password 必填' });
      return;
    }
    const row = getUserByName(db, creds.username);
    if (!row || !verifyPassword(creds.password, row.passwordHash)) {
      res.status(401).json({ error: '账号或密码错误' });
      return;
    }
    req.session.userId = row.id;
    res.status(200).json({ id: row.id, username: row.username, createdAt: row.createdAt });
  });

  router.post('/logout', (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.status(204).end();
    });
  });

  router.get('/me', (req: Request, res: Response) => {
    const uid = req.session.userId;
    if (!uid) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const user = getUserById(db, uid);
    if (!user) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    res.status(200).json(user);
  });

  return router;
}
```

- [ ] **Step 5：跑测试，确认 auth 9 条「绿」**

```bash
npm test
```

期望：services.users 6 passed + services.todos 7 passed + routes.auth 9 passed。
（routes.todos 此时仍是阶段 1 的版本——既会被 requireAuth 顶住、也调用了不带 userId 的 service，会失败；Task 6 修。）

- [ ] **Step 6：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/src/app.ts ch08_rebuild_todolist/server/src/routes/auth.ts ch08_rebuild_todolist/server/tests/routes.auth.test.ts
git commit -m "ch08 stage2: routes/auth + app.ts 装 session"
```

---

## Task 6：routes/todos 改造（TDD via supertest agent）

**Files:**
- Modify: `ch08_rebuild_todolist/server/src/routes/todos.ts`
- Modify: `ch08_rebuild_todolist/server/tests/routes.todos.test.ts`

- [ ] **Step 1：替换 `server/tests/routes.todos.test.ts` 全文**

```ts
import { describe, it, expect } from 'vitest';
import request, { type SuperAgentTest } from 'supertest';
import { createTestDb } from './setup';
import { createApp } from '../src/app';

async function loginAs(agent: SuperAgentTest, username: string) {
  await agent
    .post('/api/auth/register')
    .send({ username, password: 'pw' });
}

function newApp() {
  return createApp(createTestDb());
}

describe('todos routes', () => {
  it('未登录 GET /api/todos 返回 401', async () => {
    const res = await request(newApp()).get('/api/todos');
    expect(res.status).toBe(401);
  });

  it('GET /api/todos 默认空数组', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent.get('/api/todos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/todos 创建并返回', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent.post('/api/todos').send({ title: '看书' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('看书');
    expect(res.body.done).toBe(false);
  });

  it('POST /api/todos 缺 title 返回 400', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent.post('/api/todos').send({});
    expect(res.status).toBe(400);
  });

  it('PATCH /api/todos/:id 修改 done', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const created = await agent.post('/api/todos').send({ title: 'x' });
    const id = created.body.id;
    const res = await agent.patch(`/api/todos/${id}`).send({ done: true });
    expect(res.status).toBe(200);
    expect(res.body.done).toBe(true);
  });

  it('PATCH /api/todos/:id 不存在返回 404', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent.patch('/api/todos/999').send({ done: true });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/todos/:id 删除成功 204', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const created = await agent.post('/api/todos').send({ title: 'x' });
    const id = created.body.id;
    const res = await agent.delete(`/api/todos/${id}`);
    expect(res.status).toBe(204);
  });

  it('DELETE /api/todos/:id 不存在返回 404', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent.delete('/api/todos/999');
    expect(res.status).toBe(404);
  });

  it('用户 A 改用户 B 的 todo 返回 404（视为不存在）', async () => {
    const app = newApp();
    const aliceAgent = request.agent(app);
    const bobAgent = request.agent(app);
    await loginAs(aliceAgent, 'alice');
    await loginAs(bobAgent, 'bob');

    const created = await aliceAgent.post('/api/todos').send({ title: '私人' });
    const aliceTodoId = created.body.id;

    const patchRes = await bobAgent
      .patch(`/api/todos/${aliceTodoId}`)
      .send({ done: true });
    expect(patchRes.status).toBe(404);

    const deleteRes = await bobAgent.delete(`/api/todos/${aliceTodoId}`);
    expect(deleteRes.status).toBe(404);

    // alice 列表里它仍然在，且 done = false
    const aliceList = await aliceAgent.get('/api/todos');
    expect(aliceList.body).toHaveLength(1);
    expect(aliceList.body[0].done).toBe(false);
  });
});
```

- [ ] **Step 2：跑测试，确认「红」**

```bash
npm test
```

期望：routes.todos 多个用例失败（service 签名不一致 + 阶段 1 路由没用 session.userId）。

- [ ] **Step 3：替换 `server/src/routes/todos.ts` 全文**

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
    const todo = createTodo(db, userId(req), { title });
    res.status(201).json(todo);
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'id 非法' });
      return;
    }
    const { title, done } = req.body ?? {};
    const updated = updateTodo(db, userId(req), id, {
      title: typeof title === 'string' ? title : undefined,
      done: typeof done === 'boolean' ? done : undefined,
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

- [ ] **Step 4：跑测试，确认全绿**

```bash
npm test
```

期望：30 passed = services.users 6 + services.todos 7 + routes.auth 9 + routes.todos 9。
（实际上 services.users 是 6 条、services.todos 是 7 条、routes.auth 是 9 条、routes.todos 是 9 条 —— 合 31。若 vitest 输出 31，与上面 §7 写的 30 差一条，是因为 §7 的估算把 `getUserById` 单条折算成 0；不影响通过。）

- [ ] **Step 5：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/src/routes/todos.ts ch08_rebuild_todolist/server/tests/routes.todos.test.ts
git commit -m "ch08 stage2: routes/todos 接 session.userId + 跨用户 404 用例"
```

---

## Task 7：手动联调后端

**Files:**
- 无文件改动，纯验证

- [ ] **Step 1：清掉阶段 1 的 SQLite 老库（避免演示数据混进来）**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/server
rm -f data/todolist.sqlite data/todolist.sqlite-wal data/todolist.sqlite-shm data/todolist.sqlite-journal
```

> 备选：保留老库走自动迁移分支。这里清掉是为了让课堂演示状态最干净。

- [ ] **Step 2：启动后端**

```bash
npm run dev
```

- [ ] **Step 3：另一个终端用 curl 验证**

```bash
# 未登录访问 todos → 401
curl -s -i http://localhost:3001/api/todos | head -1
# 期望：HTTP/1.1 401 Unauthorized

# 注册（cookie 写到 /tmp/c1）
curl -s -i -c /tmp/c1 -b /tmp/c1 -X POST http://localhost:3001/api/auth/register \
  -H 'Content-Type: application/json' -d '{"username":"alice","password":"pw"}'
# 期望：201

# 用 cookie 加一条 todo
curl -s -b /tmp/c1 -c /tmp/c1 -X POST http://localhost:3001/api/todos \
  -H 'Content-Type: application/json' -d '{"title":"看书"}'
# 期望：{"id":1,"title":"看书","done":false,"createdAt":"..."}

# 列表
curl -s -b /tmp/c1 -c /tmp/c1 http://localhost:3001/api/todos
# 期望：[ {alice 的那一条} ]

# 注册 bob，列表应为空
curl -s -c /tmp/c2 -b /tmp/c2 -X POST http://localhost:3001/api/auth/register \
  -H 'Content-Type: application/json' -d '{"username":"bob","password":"pw"}' >/dev/null
curl -s -b /tmp/c2 -c /tmp/c2 http://localhost:3001/api/todos
# 期望：[]
```

按 Ctrl+C 停掉后端。

- [ ] **Step 4：无新文件需要 commit**

后端整体已就绪，进入前端工作（Task 8 起）。

---

## Task 8：前端引 react-router-dom + 拆 main / App 框架

**Files:**
- Modify: `ch08_rebuild_todolist/client/package.json`（通过 `npm i`）
- Modify: `ch08_rebuild_todolist/client/src/main.tsx`
- Modify: `ch08_rebuild_todolist/client/src/App.tsx`

- [ ] **Step 1：装 react-router-dom**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/client
npm i react-router-dom
```

- [ ] **Step 2：替换 `client/src/main.tsx` 全文（先不挂 AuthProvider，下一 task 才创建）**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 3：把 `client/src/App.tsx` 替换为占位路由分发**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<div className="p-10">登录页占位（Task 11 实现）</div>} />
      <Route path="/" element={<div className="p-10">Todos 页占位（Task 11 实现）</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 4：tsc 检查**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/client
npx tsc --noEmit
```

期望：无错误。

- [ ] **Step 5：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/client/package.json ch08_rebuild_todolist/client/package-lock.json ch08_rebuild_todolist/client/src/main.tsx ch08_rebuild_todolist/client/src/App.tsx
git commit -m "ch08 stage2: 前端引 react-router-dom + 路由占位"
```

---

## Task 9：前端 api.ts 加 authedFetch + auth 函数

**Files:**
- Modify: `ch08_rebuild_todolist/client/src/types.ts`
- Modify: `ch08_rebuild_todolist/client/src/api.ts`

- [ ] **Step 1：替换 `client/src/types.ts` 全文**

```ts
export interface Todo {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
}

export interface User {
  id: number;
  username: string;
  createdAt: string;
}
```

- [ ] **Step 2：替换 `client/src/api.ts` 全文**

```ts
import type { Todo, User } from './types';

const TODOS = '/api/todos';
const AUTH = '/api/auth';

// 统一带上 cookie，session 才能跑通
function authedFetch(url: string, init?: RequestInit) {
  return fetch(url, { ...init, credentials: 'include' });
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// --- todos ---

export async function fetchTodos(): Promise<Todo[]> {
  return handle<Todo[]>(await authedFetch(TODOS));
}

export async function createTodo(title: string): Promise<Todo> {
  return handle<Todo>(
    await authedFetch(TODOS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  );
}

export async function updateTodo(
  id: number,
  patch: Partial<Pick<Todo, 'title' | 'done'>>
): Promise<Todo> {
  return handle<Todo>(
    await authedFetch(`${TODOS}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  );
}

export async function deleteTodo(id: number): Promise<void> {
  return handle<void>(
    await authedFetch(`${TODOS}/${id}`, { method: 'DELETE' })
  );
}

// --- auth ---

export async function register(username: string, password: string): Promise<User> {
  return handle<User>(
    await authedFetch(`${AUTH}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  );
}

export async function login(username: string, password: string): Promise<User> {
  return handle<User>(
    await authedFetch(`${AUTH}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  );
}

export async function logout(): Promise<void> {
  return handle<void>(
    await authedFetch(`${AUTH}/logout`, { method: 'POST' })
  );
}

// 启动时探活：返回当前用户，未登录返回 null
export async function me(): Promise<User | null> {
  const res = await authedFetch(`${AUTH}/me`);
  if (res.status === 401) return null;
  return handle<User>(res);
}
```

- [ ] **Step 3：tsc 检查**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/client
npx tsc --noEmit
```

期望：无错误。

- [ ] **Step 4：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/client/src/types.ts ch08_rebuild_todolist/client/src/api.ts
git commit -m "ch08 stage2: 前端 api.ts 加 authedFetch + auth 调用"
```

---

## Task 10：AuthContext + RequireAuth

**Files:**
- Create: `ch08_rebuild_todolist/client/src/auth/AuthContext.tsx`
- Create: `ch08_rebuild_todolist/client/src/auth/RequireAuth.tsx`
- Modify: `ch08_rebuild_todolist/client/src/main.tsx`（包 AuthProvider）

- [ ] **Step 1：创建目录**

```bash
mkdir -p /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/client/src/auth
```

- [ ] **Step 2：写 `client/src/auth/AuthContext.tsx`**

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '../types';
import * as api from '../api';

interface AuthState {
  user: User | null;
  loading: boolean;
  login(username: string, password: string): Promise<void>;
  register(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

interface ProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: ProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 启动时探活当前 cookie 是否对应一个登录态
  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch((e) => {
        console.error(e);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const u = await api.login(username, password);
    setUser(u);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const u = await api.register(username, password);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value: AuthState = { user, loading, login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内使用');
  return ctx;
}
```

- [ ] **Step 3：写 `client/src/auth/RequireAuth.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface Props {
  children: ReactNode;
}

// 路由守卫：未登录跳 /login；探活中先白屏一闪
export function RequireAuth({ children }: Props) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 4：把 `client/src/main.tsx` 改为包 AuthProvider**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 5：tsc 检查**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/client
npx tsc --noEmit
```

期望：无错误。

- [ ] **Step 6：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/client/src/auth ch08_rebuild_todolist/client/src/main.tsx
git commit -m "ch08 stage2: 前端 AuthContext + RequireAuth"
```

---

## Task 11：LoginPage + TodosPage + App 路由接通

**Files:**
- Create: `ch08_rebuild_todolist/client/src/pages/LoginPage.tsx`
- Create: `ch08_rebuild_todolist/client/src/pages/TodosPage.tsx`
- Modify: `ch08_rebuild_todolist/client/src/App.tsx`

- [ ] **Step 1：创建目录**

```bash
mkdir -p /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/client/src/pages
```

- [ ] **Step 2：写 `client/src/pages/LoginPage.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-sm bg-white rounded shadow p-6">
        <div className="flex border-b mb-4">
          <button
            type="button"
            className={`flex-1 py-2 ${
              mode === 'login' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-500'
            }`}
            onClick={() => setMode('login')}
          >
            登录
          </button>
          <button
            type="button"
            className={`flex-1 py-2 ${
              mode === 'register' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-500'
            }`}
            onClick={() => setMode('register')}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            className="border rounded px-3 py-2"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {mode === 'login' ? '登录' : '注册并登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3：写 `client/src/pages/TodosPage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Todo } from '../types';
import * as api from '../api';
import { useAuth } from '../auth/AuthContext';
import { TodoInput } from '../components/TodoInput';
import { TodoList } from '../components/TodoList';

export default function TodosPage() {
  const { user, logout } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.fetchTodos().then(setTodos).catch((e) => setError(String(e)));
  }, []);

  async function handleAdd(title: string) {
    try {
      const t = await api.createTodo(title);
      setTodos((prev) => [...prev, t]);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleToggle(id: number, done: boolean) {
    try {
      const t = await api.updateTodo(id, { done });
      setTodos((prev) => prev.map((x) => (x.id === id ? t : x)));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleEdit(id: number, title: string) {
    try {
      const t = await api.updateTodo(id, { title });
      setTodos((prev) => prev.map((x) => (x.id === id ? t : x)));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteTodo(id);
      setTodos((prev) => prev.filter((x) => x.id !== id));
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
        <TodoInput onAdd={handleAdd} />
        <TodoList
          todos={todos}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4：替换 `client/src/App.tsx` 全文**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import LoginPage from './pages/LoginPage';
import TodosPage from './pages/TodosPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <TodosPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 5：tsc 检查**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/client
npx tsc --noEmit
```

期望：无错误。

- [ ] **Step 6：手动端到端**

两个终端：

```bash
# 终端 1
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/server
npm run dev
```

```bash
# 终端 2
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/client
npm run dev
```

打开 http://localhost:5173 （或 vite 让到的端口）：

- 自动跳到 `/login`
- "注册" tab，输入 alice / pw → 跳到 `/`，能看到「你好，alice」与空列表
- 加 1-2 条 todo → 出现
- 刷新浏览器 → 仍登录 alice，列表保留
- 点"退出" → 跳 `/login`
- "注册" tab，输入 bob / pw → 跳 `/`，列表是空的（看不到 alice 的）
- bob 加 1 条 → 出现
- 退出 bob，"登录" tab 用 alice / pw → 看到 alice 自己的 todo（看不到 bob 的）
- "登录" tab 用 alice / wrongpw → 表单下显示红色错误信息

- [ ] **Step 7：跑一次后端测试，确保仍全绿**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/server
npm test
```

期望：全绿（auth 9 + todos route 9 + users service 6 + todos service 7）。

- [ ] **Step 8：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/client/src/pages ch08_rebuild_todolist/client/src/App.tsx
git commit -m "ch08 stage2: LoginPage / TodosPage 接通登录态 + 路由守卫"
```

---

## Task 12：README 阶段进度表更新

**Files:**
- Modify: `ch08_rebuild_todolist/README.md`

- [ ] **Step 1：把 `ch08_rebuild_todolist/README.md` 阶段进度表里第 2 行替换为**

把这一行：

```
| 2 | 登录 + 用户隔离 | ⏳ 待开始 | — | — |
```

替换为：

```
| 2 | 登录 + 用户隔离 | ✅ 完成 | [link](docs/superpowers/specs/2026-06-13-stage2-auth-design.md) | [link](docs/superpowers/plans/2026-06-13-stage2-auth-plan.md) |
```

- [ ] **Step 2：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/README.md
git commit -m "ch08 stage2: README 阶段进度表标记阶段 2 完成"
```

---

## 阶段 2 完成确认

走完上面所有 task 后，逐项核对：

- [ ] `cd ch08_rebuild_todolist/server && npm test` → 全绿（≥30 条）
- [ ] 浏览器手动跑通：
  - 注册 alice → 自动登录 → 加 todo → 退出
  - 注册 bob → 加 todo → 看不到 alice 的
  - 退出 bob → 用 alice/pw 登录 → 看到 alice 自己的，看不到 bob 的
  - 用 alice/wrongpw 登录 → 红字错误
  - 注册重复用户名 → 红字错误
  - 刷新浏览器仍保持登录态
  - 直接访问 `/` 时未登录会跳 `/login`
- [ ] git log 上能看到阶段 2 的多次 commit
- [ ] README 中阶段 2 标 ✅ 并补 spec/plan 链接
- [ ] 课堂可从阶段 1 末尾顺序复现完整阶段 2

通过后即可开始阶段 3 的 brainstorming。
