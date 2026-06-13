# ch08 阶段 1（MVP）实现 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在空目录下从零搭出一个最小可用的 TODO List —— 单用户、无登录、可增/删/改/查、SQLite 持久化，前后端分离。

**Architecture:** 前后端两个独立 npm 项目（`server/` + `client/`），后端 Express + better-sqlite3 三层（routes → services → db），前端 React + Vite + Tailwind。后端用 vitest + supertest 做 TDD；阶段 1 只覆盖后端 services 与关键 routes，前端靠手动验证。

**Tech Stack:** Node.js, TypeScript, Express, better-sqlite3, vitest, supertest, React 18, Vite, Tailwind, fetch。

**Spec：** `docs/superpowers/specs/2026-06-13-ch08-rebuild-todolist-design.md`

**完成定义（DoD）：**
- 在 `ch08_rebuild_todolist/` 下能 `npm run dev` 同时跑通前后端
- 能在浏览器里增、删、改（标记完成/取消完成、改标题）、查 todos
- 刷新页面后数据仍在
- `cd server && npm test` 全绿
- 阶段 1 的 design 与 plan 已 commit

---

## 文件结构（阶段 1 结束后）

```
ch08_rebuild_todolist/
├── README.md                               # 章节导览
├── docs/superpowers/
│   ├── specs/2026-06-13-stage1-mvp-design.md
│   ├── specs/2026-06-13-ch08-rebuild-todolist-design.md  (已存在)
│   └── plans/2026-06-13-stage1-mvp-plan.md (本文件)
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── .gitignore
│   ├── data/                               # SQLite 文件落盘处（git ignore）
│   ├── src/
│   │   ├── index.ts                        # 启动入口
│   │   ├── app.ts                          # 装配 Express app
│   │   ├── db/
│   │   │   ├── connection.ts               # 打开/创建 SQLite 连接
│   │   │   └── schema.ts                   # 建表 SQL
│   │   ├── services/
│   │   │   └── todos.ts                    # 业务逻辑
│   │   ├── routes/
│   │   │   └── todos.ts                    # HTTP 层
│   │   └── types.ts                        # Todo 类型
│   └── tests/
│       ├── setup.ts                        # 内存 DB 工厂
│       ├── services.todos.test.ts
│       └── routes.todos.test.ts
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── .gitignore
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css                       # Tailwind 三指令
        ├── api.ts                          # fetch 封装
        ├── types.ts
        └── components/
            ├── TodoInput.tsx
            ├── TodoList.tsx
            └── TodoItem.tsx
```

**职责约定：**
- `db/connection.ts` 只管打开连接；`db/schema.ts` 只管建表；不写业务
- `services/todos.ts` 只管业务逻辑，输入/输出都是 plain object，不知道 HTTP 的存在
- `routes/todos.ts` 只做参数校验、调 service、返回 JSON；不直接碰 DB
- 前端 `api.ts` 是唯一与后端通信的地方；组件不直接 fetch

---

## 任务概览

| # | 任务 | 输出 |
|---|---|---|
| 1 | 写阶段 1 的 design | spec 文档 + commit |
| 2 | 后端脚手架 + 第一条端到端 TDD 演示 | 能 `npm test` |
| 3 | services：getAll / create | 两条 service 测试 |
| 4 | services：update / delete | 四条 service 测试 |
| 5 | routes：GET/POST | supertest 接通 HTTP |
| 6 | routes：PATCH/DELETE | 路由全 CRUD |
| 7 | server 启动入口 + 数据持久化到文件 | `npm run dev` 跑得起来 |
| 8 | 前端脚手架（Vite + Tailwind） | `npm run dev` 出空白页 |
| 9 | 前端 api.ts + 类型 | 模块就绪 |
| 10 | 前端 TodoInput / TodoList / TodoItem | 浏览器能跑通 CRUD |
| 11 | README + 阶段进度表 | 课堂导览 |

---

## Task 1：写阶段 1 design 文档

**Files:**
- Create: `ch08_rebuild_todolist/docs/superpowers/specs/2026-06-13-stage1-mvp-design.md`

- [ ] **Step 1：写 design 文档**

内容应覆盖：
- 阶段范围（仅 CRUD + 持久化，无登录、无任何过滤、无分类/优先级/截止日期）
- 后端 schema（仅 `todos`：`id` / `title` / `done` / `created_at`，**不**含 `user_id`）
- API：`GET /api/todos`、`POST /api/todos`、`PATCH /api/todos/:id`、`DELETE /api/todos/:id`
- 前端：单页，输入框 + 列表 + 每条复选框/编辑/删除按钮
- 测试范围：服务层 + 路由层；前端不写测试
- 「老数据怎么办」：阶段 1 是首次建表，无遗留

参考已有总 spec 的 §3、§5、§6、§7，写一份 80–120 行的子 spec 即可。

- [ ] **Step 2：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/docs/superpowers/specs/2026-06-13-stage1-mvp-design.md
git commit -m "ch08 stage1: 写 MVP 阶段 design 文档"
```

---

## Task 2：后端脚手架 + 第一条端到端 TDD 演示

> 这是阶段 1 的「Red-Green-Refactor 仪式」演示步骤——课堂上完整跑一遍。

**Files:**
- Create: `ch08_rebuild_todolist/server/package.json`
- Create: `ch08_rebuild_todolist/server/tsconfig.json`
- Create: `ch08_rebuild_todolist/server/vitest.config.ts`
- Create: `ch08_rebuild_todolist/server/.gitignore`
- Create: `ch08_rebuild_todolist/server/src/db/connection.ts`
- Create: `ch08_rebuild_todolist/server/src/db/schema.ts`
- Create: `ch08_rebuild_todolist/server/src/types.ts`
- Create: `ch08_rebuild_todolist/server/tests/setup.ts`
- Create: `ch08_rebuild_todolist/server/tests/services.todos.test.ts`
- Create: `ch08_rebuild_todolist/server/src/services/todos.ts`

- [ ] **Step 1：初始化后端项目**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist
mkdir -p server/src/{db,services,routes} server/tests server/data
cd server
npm init -y
npm i express better-sqlite3 cors
npm i -D typescript tsx @types/node @types/express @types/better-sqlite3 @types/cors vitest supertest @types/supertest
```

- [ ] **Step 2：写 `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "noImplicitAny": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3：写 `server/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
  },
});
```

- [ ] **Step 4：写 `server/.gitignore`**

```
node_modules
dist
data/*.sqlite
data/*.sqlite-journal
```

- [ ] **Step 5：改 `server/package.json` scripts**

把 `scripts` 段改为：

```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "vitest run"
}
```

- [ ] **Step 6：写 `server/src/types.ts`**

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
```

- [ ] **Step 7：写 `server/src/db/schema.ts`**

```ts
import type Database from 'better-sqlite3';

// 在传入的连接上建表（如不存在）
export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
}
```

- [ ] **Step 8：写 `server/src/db/connection.ts`**

```ts
import Database from 'better-sqlite3';
import path from 'node:path';
import { initSchema } from './schema';

// 打开（或创建）一个文件型 SQLite 连接
export function openDatabase(filename?: string): Database.Database {
  const file = filename ?? path.resolve(__dirname, '../../data/todolist.sqlite');
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  initSchema(db);
  return db;
}
```

- [ ] **Step 9：写 `server/tests/setup.ts`**

```ts
import Database from 'better-sqlite3';
import { initSchema } from '../src/db/schema';

// 每个测试用例调用一次，得到一个干净的内存数据库
export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  initSchema(db);
  return db;
}
```

- [ ] **Step 10：写第一条失败测试 `server/tests/services.todos.test.ts`**

```ts
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
```

- [ ] **Step 11：跑测试，确认它「红」**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/server
npm test
```

期望：失败，提示 `Cannot find module '../src/services/todos'` 或类似。

- [ ] **Step 12：写最小实现 `server/src/services/todos.ts`**

```ts
import type Database from 'better-sqlite3';
import type { Todo, CreateTodoInput } from '../types';

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

export function createTodo(db: Database.Database, input: CreateTodoInput): Todo {
  const createdAt = new Date().toISOString();
  const stmt = db.prepare(
    'INSERT INTO todos (title, done, created_at) VALUES (?, 0, ?)'
  );
  const info = stmt.run(input.title, createdAt);
  return {
    id: Number(info.lastInsertRowid),
    title: input.title,
    done: false,
    createdAt,
  };
}

export function getAllTodos(db: Database.Database): Todo[] {
  const rows = db
    .prepare('SELECT id, title, done, created_at FROM todos ORDER BY id ASC')
    .all() as TodoRow[];
  return rows.map(rowToTodo);
}
```

- [ ] **Step 13：跑测试，确认它「绿」**

```bash
npm test
```

期望：1 passed。

- [ ] **Step 14：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server
git commit -m "ch08 stage1: 后端脚手架 + 第一条 TDD（create/getAll）"
```

---

## Task 3：services 补完 update / delete（仍是 TDD）

**Files:**
- Modify: `ch08_rebuild_todolist/server/tests/services.todos.test.ts`
- Modify: `ch08_rebuild_todolist/server/src/services/todos.ts`

- [ ] **Step 1：在测试文件 describe 块内追加用例**

```ts
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
```

并在文件顶部 import 中加上 `updateTodo, deleteTodo`：

```ts
import { createTodo, getAllTodos, updateTodo, deleteTodo } from '../src/services/todos';
```

- [ ] **Step 2：跑测试，确认 4 个新用例「红」**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/server
npm test
```

期望：4 个新用例失败（找不到 `updateTodo` / `deleteTodo`）。

- [ ] **Step 3：在 `server/src/services/todos.ts` 末尾加实现**

```ts
import type { UpdateTodoInput } from '../types';

export function updateTodo(
  db: Database.Database,
  id: number,
  input: UpdateTodoInput
): Todo | null {
  const existing = db
    .prepare('SELECT id, title, done, created_at FROM todos WHERE id = ?')
    .get(id) as TodoRow | undefined;
  if (!existing) return null;

  const nextTitle = input.title ?? existing.title;
  const nextDone = input.done === undefined ? existing.done : input.done ? 1 : 0;
  db.prepare('UPDATE todos SET title = ?, done = ? WHERE id = ?').run(
    nextTitle,
    nextDone,
    id
  );
  return rowToTodo({ ...existing, title: nextTitle, done: nextDone });
}

export function deleteTodo(db: Database.Database, id: number): boolean {
  const info = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  return info.changes > 0;
}
```

注意：把上面新加的 `import type { UpdateTodoInput }` 与最初那条 import 合并，避免重复 import。

- [ ] **Step 4：跑测试，确认全绿**

```bash
npm test
```

期望：5 passed（含 Task 2 的 1 条）。

- [ ] **Step 5：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/src/services/todos.ts ch08_rebuild_todolist/server/tests/services.todos.test.ts
git commit -m "ch08 stage1: services 补完 update / delete"
```

---

## Task 4：app.ts + routes/todos.ts —— GET / POST（supertest）

**Files:**
- Create: `ch08_rebuild_todolist/server/src/app.ts`
- Create: `ch08_rebuild_todolist/server/src/routes/todos.ts`
- Create: `ch08_rebuild_todolist/server/tests/routes.todos.test.ts`

- [ ] **Step 1：写 routes 测试 `server/tests/routes.todos.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestDb } from './setup';
import { createApp } from '../src/app';

describe('todos routes', () => {
  it('GET /api/todos 默认空数组', async () => {
    const app = createApp(createTestDb());
    const res = await request(app).get('/api/todos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/todos 创建并返回', async () => {
    const app = createApp(createTestDb());
    const res = await request(app)
      .post('/api/todos')
      .send({ title: '看书' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('看书');
    expect(res.body.done).toBe(false);
  });

  it('POST /api/todos 缺 title 返回 400', async () => {
    const app = createApp(createTestDb());
    const res = await request(app).post('/api/todos').send({});
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2：跑测试，确认「红」**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/server
npm test
```

期望：找不到 `../src/app` 模块。

- [ ] **Step 3：写 `server/src/routes/todos.ts`**

```ts
import { Router, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import {
  createTodo,
  getAllTodos,
  updateTodo,
  deleteTodo,
} from '../services/todos';

export function createTodosRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.json(getAllTodos(db));
  });

  router.post('/', (req: Request, res: Response) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title) {
      res.status(400).json({ error: 'title 必填' });
      return;
    }
    const todo = createTodo(db, { title });
    res.status(201).json(todo);
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'id 非法' });
      return;
    }
    const { title, done } = req.body ?? {};
    const updated = updateTodo(db, id, {
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
    const ok = deleteTodo(db, id);
    if (!ok) {
      res.status(404).json({ error: '未找到' });
      return;
    }
    res.status(204).end();
  });

  return router;
}
```

- [ ] **Step 4：写 `server/src/app.ts`**

```ts
import express from 'express';
import cors from 'cors';
import type Database from 'better-sqlite3';
import { createTodosRouter } from './routes/todos';

// 注入 db 便于测试时使用内存连接
export function createApp(db: Database.Database) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/todos', createTodosRouter(db));
  return app;
}
```

- [ ] **Step 5：跑测试，确认「绿」**

```bash
npm test
```

期望：8 passed（services 5 + routes 3）。

- [ ] **Step 6：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/src/app.ts ch08_rebuild_todolist/server/src/routes ch08_rebuild_todolist/server/tests/routes.todos.test.ts
git commit -m "ch08 stage1: app + routes（GET/POST 已通过 supertest）"
```

---

## Task 5：routes 补 PATCH / DELETE 的 supertest 用例

> 路由代码 Task 4 已写完；这里只补测试，确认 PATCH/DELETE 工作正确。

**Files:**
- Modify: `ch08_rebuild_todolist/server/tests/routes.todos.test.ts`

- [ ] **Step 1：在 describe 块尾追加 4 个用例**

```ts
  it('PATCH /api/todos/:id 修改 done', async () => {
    const app = createApp(createTestDb());
    const created = await request(app).post('/api/todos').send({ title: 'x' });
    const id = created.body.id;
    const res = await request(app).patch(`/api/todos/${id}`).send({ done: true });
    expect(res.status).toBe(200);
    expect(res.body.done).toBe(true);
  });

  it('PATCH /api/todos/:id 不存在返回 404', async () => {
    const app = createApp(createTestDb());
    const res = await request(app).patch('/api/todos/999').send({ done: true });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/todos/:id 删除成功 204', async () => {
    const app = createApp(createTestDb());
    const created = await request(app).post('/api/todos').send({ title: 'x' });
    const id = created.body.id;
    const res = await request(app).delete(`/api/todos/${id}`);
    expect(res.status).toBe(204);
  });

  it('DELETE /api/todos/:id 不存在返回 404', async () => {
    const app = createApp(createTestDb());
    const res = await request(app).delete('/api/todos/999');
    expect(res.status).toBe(404);
  });
```

- [ ] **Step 2：跑测试**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/server
npm test
```

期望：12 passed。

- [ ] **Step 3：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/tests/routes.todos.test.ts
git commit -m "ch08 stage1: routes PATCH / DELETE 测试用例"
```

---

## Task 6：后端启动入口 + 文件持久化跑通

**Files:**
- Create: `ch08_rebuild_todolist/server/src/index.ts`

- [ ] **Step 1：写 `server/src/index.ts`**

```ts
import { createApp } from './app';
import { openDatabase } from './db/connection';

const port = Number(process.env.PORT ?? 3001);
const db = openDatabase();
const app = createApp(db);

app.listen(port, () => {
  console.log(`[server] http://localhost:${port}`);
});
```

- [ ] **Step 2：手动验证**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/server
npm run dev
```

新开一个终端：

```bash
curl -s http://localhost:3001/api/todos
# 期望：[]

curl -s -X POST http://localhost:3001/api/todos \
  -H 'Content-Type: application/json' -d '{"title":"看书"}'
# 期望：{"id":1,"title":"看书","done":false,"createdAt":"..."}

curl -s http://localhost:3001/api/todos
# 期望：刚才那条
```

按 Ctrl+C 停掉 dev，再次 `npm run dev` 然后 `curl` —— 之前的数据应该还在（这就验证了文件持久化）。

- [ ] **Step 3：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/src/index.ts
git commit -m "ch08 stage1: 后端启动入口 + 文件持久化"
```

---

## Task 7：前端脚手架（Vite + React + Tailwind）

**Files:**
- Create: `ch08_rebuild_todolist/client/package.json`
- Create: `ch08_rebuild_todolist/client/tsconfig.json`
- Create: `ch08_rebuild_todolist/client/vite.config.ts`
- Create: `ch08_rebuild_todolist/client/tailwind.config.js`
- Create: `ch08_rebuild_todolist/client/postcss.config.js`
- Create: `ch08_rebuild_todolist/client/index.html`
- Create: `ch08_rebuild_todolist/client/.gitignore`
- Create: `ch08_rebuild_todolist/client/src/main.tsx`
- Create: `ch08_rebuild_todolist/client/src/App.tsx`
- Create: `ch08_rebuild_todolist/client/src/index.css`

- [ ] **Step 1：用 Vite 模板创建项目**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist
npm create vite@latest client -- --template react-ts
cd client
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2：写 `client/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 3：写 `client/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4：写 `client/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
```

> 注意：项目根 CLAUDE.md 写「不要修改 vite.config.ts 中的 proxy 配置」——这一条是针对**已存在的** proxy 不要乱改；ch08 是从零起步首次创建该文件，仍按 ch05 的 proxy 写法落定即可。

- [ ] **Step 5：把 `client/src/main.tsx` 改为引入 Tailwind**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 6：把 `client/src/App.tsx` 替换为最小占位**

```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <h1 className="text-2xl font-bold">TODO List（ch08 阶段 1）</h1>
    </div>
  );
}
```

- [ ] **Step 7：手动验证**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/client
npm run dev
```

打开 http://localhost:5173 —— 应看到居中的标题，背景是浅灰（说明 Tailwind 生效）。

- [ ] **Step 8：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/client
git commit -m "ch08 stage1: 前端脚手架（Vite + React + Tailwind）"
```

---

## Task 8：前端 api.ts + 类型定义

**Files:**
- Create: `ch08_rebuild_todolist/client/src/types.ts`
- Create: `ch08_rebuild_todolist/client/src/api.ts`

- [ ] **Step 1：写 `client/src/types.ts`**

```ts
export interface Todo {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
}
```

- [ ] **Step 2：写 `client/src/api.ts`**

```ts
import type { Todo } from './types';

const BASE = '/api/todos';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchTodos(): Promise<Todo[]> {
  return handle<Todo[]>(await fetch(BASE));
}

export async function createTodo(title: string): Promise<Todo> {
  return handle<Todo>(
    await fetch(BASE, {
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
    await fetch(`${BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  );
}

export async function deleteTodo(id: number): Promise<void> {
  return handle<void>(await fetch(`${BASE}/${id}`, { method: 'DELETE' }));
}
```

- [ ] **Step 3：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/client/src/types.ts ch08_rebuild_todolist/client/src/api.ts
git commit -m "ch08 stage1: 前端 api 封装 + 类型"
```

---

## Task 9：前端组件 + App 接通

**Files:**
- Create: `ch08_rebuild_todolist/client/src/components/TodoInput.tsx`
- Create: `ch08_rebuild_todolist/client/src/components/TodoItem.tsx`
- Create: `ch08_rebuild_todolist/client/src/components/TodoList.tsx`
- Modify: `ch08_rebuild_todolist/client/src/App.tsx`

- [ ] **Step 1：写 `client/src/components/TodoInput.tsx`**

```tsx
import { useState, type FormEvent } from 'react';

interface Props {
  onAdd: (title: string) => void;
}

// 顶部输入框，回车或点按钮提交
export function TodoInput({ onAdd }: Props) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = value.trim();
    if (!t) return;
    onAdd(t);
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        className="flex-1 border rounded px-3 py-2"
        placeholder="想做点什么..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        添加
      </button>
    </form>
  );
}
```

- [ ] **Step 2：写 `client/src/components/TodoItem.tsx`**

```tsx
import { useState } from 'react';
import type { Todo } from '../types';

interface Props {
  todo: Todo;
  onToggle: (id: number, done: boolean) => void;
  onEdit: (id: number, title: string) => void;
  onDelete: (id: number) => void;
}

export function TodoItem({ todo, onToggle, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);

  function save() {
    const t = draft.trim();
    if (!t) return;
    onEdit(todo.id, t);
    setEditing(false);
  }

  return (
    <li className="flex items-center gap-2 py-2 border-b last:border-b-0">
      <input
        type="checkbox"
        checked={todo.done}
        onChange={(e) => onToggle(todo.id, e.target.checked)}
      />
      {editing ? (
        <input
          autoFocus
          className="flex-1 border rounded px-2 py-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') {
              setDraft(todo.title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <span
          className={`flex-1 ${todo.done ? 'line-through text-gray-400' : ''}`}
          onDoubleClick={() => setEditing(true)}
        >
          {todo.title}
        </span>
      )}
      <button
        className="text-sm text-gray-500 hover:text-gray-800"
        onClick={() => setEditing((v) => !v)}
      >
        编辑
      </button>
      <button
        className="text-sm text-red-500 hover:text-red-700"
        onClick={() => onDelete(todo.id)}
      >
        删除
      </button>
    </li>
  );
}
```

- [ ] **Step 3：写 `client/src/components/TodoList.tsx`**

```tsx
import type { Todo } from '../types';
import { TodoItem } from './TodoItem';

interface Props {
  todos: Todo[];
  onToggle: (id: number, done: boolean) => void;
  onEdit: (id: number, title: string) => void;
  onDelete: (id: number) => void;
}

export function TodoList({ todos, onToggle, onEdit, onDelete }: Props) {
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
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
```

- [ ] **Step 4：把 `client/src/App.tsx` 替换为接通版**

```tsx
import { useEffect, useState } from 'react';
import type { Todo } from './types';
import * as api from './api';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.fetchTodos().then(setTodos).catch((e) => setError(String(e)));
  }, []);

  async function handleAdd(title: string) {
    const t = await api.createTodo(title);
    setTodos((prev) => [...prev, t]);
  }

  async function handleToggle(id: number, done: boolean) {
    const t = await api.updateTodo(id, { done });
    setTodos((prev) => prev.map((x) => (x.id === id ? t : x)));
  }

  async function handleEdit(id: number, title: string) {
    const t = await api.updateTodo(id, { title });
    setTodos((prev) => prev.map((x) => (x.id === id ? t : x)));
  }

  async function handleDelete(id: number) {
    await api.deleteTodo(id);
    setTodos((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-xl mx-auto bg-white rounded shadow p-6">
        <h1 className="text-2xl font-bold mb-4">TODO List</h1>
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

- [ ] **Step 5：手动验证（端到端）**

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

打开 http://localhost:5173 ：
- 输入「读书」添加 → 列表里出现一条
- 勾选复选框 → 文字变灰带删除线
- 双击文字或点「编辑」改标题 → 列表更新
- 点「删除」 → 该条消失
- 刷新浏览器 → 数据仍在
- 关掉 server 后再启动 → 数据仍在

- [ ] **Step 6：跑后端测试，确保仍全绿**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial/ch08_rebuild_todolist/server
npm test
```

期望：12 passed。

- [ ] **Step 7：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/client
git commit -m "ch08 stage1: 前端 CRUD UI 接通后端"
```

---

## Task 10：README + 阶段进度表

**Files:**
- Create: `ch08_rebuild_todolist/README.md`

- [ ] **Step 1：写 `ch08_rebuild_todolist/README.md`**

文件内容如下（注意：下文 `~~~` 处实际写入文件时要替换为三个反引号 ` ``` `；这里用波浪线只是为了避免本 plan 文档自身的代码块嵌套乱掉）：

~~~
# ch08 · 用 AI 重建 TODO List

从空目录出发，跟着 Claude Code 一起把 ch05 的 TODO List 重建一遍，外加四个新亮点。教学主线是 **AI 协作流程**：每个阶段都跑一次完整的 brainstorm → spec → plan → TDD → 实现 → 验证 → commit 循环。

## 设计文档

- 总设计：[`docs/superpowers/specs/2026-06-13-ch08-rebuild-todolist-design.md`](docs/superpowers/specs/2026-06-13-ch08-rebuild-todolist-design.md)

## 阶段进度

| # | 阶段 | 状态 | Spec | Plan |
|---|---|---|---|---|
| 1 | MVP（CRUD + 持久化） | ✅ 完成 | [link](docs/superpowers/specs/2026-06-13-stage1-mvp-design.md) | [link](docs/superpowers/plans/2026-06-13-stage1-mvp-plan.md) |
| 2 | 登录 + 用户隔离 | ⏳ 待开始 | — | — |
| 3 | 分类 + 优先级 + 截止日期 | ⏳ 待开始 | — | — |
| 4 | 过滤 + 搜索 | ⏳ 待开始 | — | — |
| 5 | 拖拽排序 | ⏳ 待开始 | — | — |
| 6 | 多标签 tags | ⏳ 待开始 | — | — |
| 7 | 深色模式 | ⏳ 待开始 | — | — |

## 启动

两个终端：

~~~bash
cd server && npm install && npm run dev   # http://localhost:3001
~~~

~~~bash
cd client && npm install && npm run dev   # http://localhost:5173
~~~

## 测试

~~~bash
cd server && npm test
~~~
~~~

- [ ] **Step 2：commit**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/README.md
git commit -m "ch08 stage1: 加 README 与阶段进度表"
```

---

## 阶段 1 完成确认

走完上面所有 task 后，逐项核对：

- [ ] `cd ch08_rebuild_todolist/server && npm test` → 12 passed
- [ ] 同时启动前后端，浏览器里手动跑通：增、删、改、勾选、刷新数据仍在
- [ ] git log 上能看到阶段 1 的多次 commit
- [ ] README 中阶段 1 标记为 ✅
- [ ] 可以在课堂上从空目录到完整 MVP 顺序复现整条流程

通过后即可开始阶段 2 的 brainstorming。
