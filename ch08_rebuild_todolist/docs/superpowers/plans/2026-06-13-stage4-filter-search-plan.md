# 阶段 4 实现 plan：过滤 + 搜索

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 `GET /api/todos` 加 5 个可选 query（`done` / `category` / `priority` / `due` / `q`），多条件 AND 组合；前端新增受控 `FilterBar` 组件，状态放在 `TodosPage`，输入即过滤。

**Architecture:** 后端 service 层 `getAllTodos` 改名 + 接 filters 参数，按非空 filter 拼 WHERE；`due` 走四个预设桶（today/week/overdue/none），`q` 用 `LOWER(title) LIKE LOWER(?) ESCAPE '\'`，对 `\` `%` `_` 转义；route 解析 query → 校验 → 调 service。前端 `FilterBar` 受控，`Filters` state 在 `TodosPage`，`useEffect([filters])` 触发 refetch；`fetchTodos(filters)` 拼 query string。

**Tech Stack:** Express 4 + better-sqlite3 + vitest + supertest（后端）；React 18 + TypeScript + Vite + Tailwind（前端）。

**Spec:** `docs/superpowers/specs/2026-06-13-stage4-filter-search-design.md`

---

## File Structure

**后端：**
- `server/src/services/todos.ts` — `getAllTodos` 加 `filters: ListFilters` 参数，按非空 filter 拼 WHERE 与参数
- `server/src/types.ts` — 增加 `ListFilters` 接口
- `server/src/routes/todos.ts` — `GET /` 解析 query + 校验 + 调 `getAllTodos(db, userId, filters)`
- `server/tests/services.todos.test.ts` — 加 12 条 filter 用例
- `server/tests/routes.todos.test.ts` — 加 5 条 query 用例

**前端：**
- `client/src/components/FilterBar.tsx` — 新建，受控组件
- `client/src/api.ts` — `fetchTodos` 接受可选 `Filters`，拼 query string
- `client/src/pages/TodosPage.tsx` — 新增 `filters` state、`useEffect([filters])` refetch、`categories` 派生

---

## Task 1: 后端 filters 类型 + 排序常量重构

**Files:**
- Modify: `server/src/types.ts`
- Modify: `server/src/services/todos.ts`

- [ ] **Step 1: 在 types.ts 末尾新增 ListFilters**

在 `server/src/types.ts` 末尾追加（紧跟 SessionData 之后，文件 EOF 之前；不要替换已有内容）：

```ts
// 列表过滤参数
export interface ListFilters {
  done?: 'active' | 'done';
  category?: string;
  priority?: 1 | 2 | 3;
  due?: 'today' | 'week' | 'overdue' | 'none';
  q?: string;
}
```

- [ ] **Step 2: 抽 ORDER BY 常量**

打开 `server/src/services/todos.ts`，在 `SELECT_COLUMNS` 常量下方追加：

```ts
const ORDER_BY =
  'ORDER BY priority DESC NULLS LAST, due_date ASC NULLS LAST, id ASC';
```

并修改 `getAllTodos` 用 `ORDER_BY` 常量替换内联字符串：

```ts
export function getAllTodos(db: Database.Database, userId: number): Todo[] {
  const rows = db
    .prepare(
      `SELECT ${SELECT_COLUMNS} FROM todos WHERE user_id = ? ${ORDER_BY}`
    )
    .all(userId) as TodoRow[];
  return rows.map(rowToTodo);
}
```

- [ ] **Step 3: 跑测试确认未破坏**

Run: `cd server && npm test`
Expected: 全部测试 PASS（重构不改语义）。

- [ ] **Step 4: 提交**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/src/types.ts ch08_rebuild_todolist/server/src/services/todos.ts
git commit -m "refactor(stage4): 抽 ORDER_BY 常量，准备 filters"
```

---

## Task 2: getAllTodos 加 filters —— done 维度

**Files:**
- Modify: `server/src/services/todos.ts`
- Test: `server/tests/services.todos.test.ts`

- [ ] **Step 1: 写失败测试**

在 `server/tests/services.todos.test.ts` 的 `describe('todos service', () => {` 内、最后一个 `it(...)` 之后追加：

```ts
  it("过滤：done='active' 只返回未完成", () => {
    const { db, aliceId } = bootstrap();
    const t1 = createTodo(db, aliceId, { title: 'a' });
    const t2 = createTodo(db, aliceId, { title: 'b' });
    updateTodo(db, aliceId, t2.id, { done: true });

    const list = getAllTodos(db, aliceId, { done: 'active' });
    expect(list.map((t) => t.id)).toEqual([t1.id]);
  });

  it("过滤：done='done' 只返回已完成", () => {
    const { db, aliceId } = bootstrap();
    createTodo(db, aliceId, { title: 'a' });
    const t2 = createTodo(db, aliceId, { title: 'b' });
    updateTodo(db, aliceId, t2.id, { done: true });

    const list = getAllTodos(db, aliceId, { done: 'done' });
    expect(list.map((t) => t.id)).toEqual([t2.id]);
  });
```

- [ ] **Step 2: 跑测试看到失败**

Run: `cd server && npx vitest run tests/services.todos.test.ts -t "过滤：done"`
Expected: 2 个 FAIL —— `getAllTodos` 不接受第三个参数（TS 编译错）或忽略 filters。

- [ ] **Step 3: 改 getAllTodos 接收 filters**

把 `server/src/services/todos.ts` 中的 `getAllTodos` 替换为：

```ts
export function getAllTodos(
  db: Database.Database,
  userId: number,
  filters: ListFilters = {}
): Todo[] {
  const where: string[] = ['user_id = ?'];
  const params: (string | number)[] = [userId];

  if (filters.done === 'active') where.push('done = 0');
  if (filters.done === 'done') where.push('done = 1');

  const sql = `SELECT ${SELECT_COLUMNS} FROM todos WHERE ${where.join(' AND ')} ${ORDER_BY}`;
  const rows = db.prepare(sql).all(...params) as TodoRow[];
  return rows.map(rowToTodo);
}
```

并在文件顶部 import 中加上 `ListFilters`：

```ts
import type { Todo, CreateTodoInput, UpdateTodoInput, ListFilters } from '../types';
```

- [ ] **Step 4: 跑测试看到通过**

Run: `cd server && npx vitest run tests/services.todos.test.ts -t "过滤：done"`
Expected: 2 PASS。

- [ ] **Step 5: 全量测试**

Run: `cd server && npm test`
Expected: 全部 PASS。

- [ ] **Step 6: 提交**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/src/services/todos.ts ch08_rebuild_todolist/server/tests/services.todos.test.ts
git commit -m "feat(stage4): listTodos 支持 done 过滤"
```

---

## Task 3: filters —— category + priority

**Files:**
- Modify: `server/src/services/todos.ts`
- Test: `server/tests/services.todos.test.ts`

- [ ] **Step 1: 写失败测试**

在 `services.todos.test.ts` 之前追加用例的位置继续追加：

```ts
  it("过滤：category 精确匹配", () => {
    const { db, aliceId } = bootstrap();
    createTodo(db, aliceId, { title: 'a', category: '工作' });
    createTodo(db, aliceId, { title: 'b', category: '生活' });
    createTodo(db, aliceId, { title: 'c' }); // null

    const list = getAllTodos(db, aliceId, { category: '工作' });
    expect(list.map((t) => t.title)).toEqual(['a']);
  });

  it("过滤：priority 精确匹配", () => {
    const { db, aliceId } = bootstrap();
    createTodo(db, aliceId, { title: 'a', priority: 3 });
    createTodo(db, aliceId, { title: 'b', priority: 2 });
    createTodo(db, aliceId, { title: 'c' });

    const list = getAllTodos(db, aliceId, { priority: 3 });
    expect(list.map((t) => t.title)).toEqual(['a']);
  });
```

- [ ] **Step 2: 跑测试看到失败**

Run: `cd server && npx vitest run tests/services.todos.test.ts -t "过滤：(category|priority)"`
Expected: 2 FAIL（filter 未生效，全量返回）。

- [ ] **Step 3: 在 getAllTodos 内追加 category 与 priority 分支**

在 `getAllTodos` 内 `if (filters.done === 'done') ...` 之后追加：

```ts
  if (filters.category) {
    where.push('category = ?');
    params.push(filters.category);
  }
  if (filters.priority) {
    where.push('priority = ?');
    params.push(filters.priority);
  }
```

- [ ] **Step 4: 跑测试看到通过**

Run: `cd server && npx vitest run tests/services.todos.test.ts -t "过滤：(category|priority)"`
Expected: 2 PASS。

- [ ] **Step 5: 提交**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/src/services/todos.ts ch08_rebuild_todolist/server/tests/services.todos.test.ts
git commit -m "feat(stage4): listTodos 支持 category/priority 过滤"
```

---

## Task 4: filters —— due 四桶

**Files:**
- Modify: `server/src/services/todos.ts`
- Test: `server/tests/services.todos.test.ts`

- [ ] **Step 1: 写失败测试**

注意：用例中需要"今天"作为基准日。我们直接在测试里用同一份 `today()` 算法生成，避免和 service 不一致。在 `services.todos.test.ts` 顶部 import 之后追加帮助函数：

```ts
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function offsetDate(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
```

然后在 `describe` 末尾追加：

```ts
  it("过滤：due='today' 只命中今天", () => {
    const { db, aliceId } = bootstrap();
    createTodo(db, aliceId, { title: 't0', dueDate: localToday() });
    createTodo(db, aliceId, { title: 't1', dueDate: offsetDate(1) });
    createTodo(db, aliceId, { title: 't_1', dueDate: offsetDate(-1) });
    createTodo(db, aliceId, { title: 'tnull' });

    const list = getAllTodos(db, aliceId, { due: 'today' });
    expect(list.map((t) => t.title)).toEqual(['t0']);
  });

  it("过滤：due='week' 命中今天起 7 天内（含端点）", () => {
    const { db, aliceId } = bootstrap();
    createTodo(db, aliceId, { title: 't0', dueDate: localToday() });
    createTodo(db, aliceId, { title: 't6', dueDate: offsetDate(6) });
    createTodo(db, aliceId, { title: 't7', dueDate: offsetDate(7) });
    createTodo(db, aliceId, { title: 't_1', dueDate: offsetDate(-1) });

    const list = getAllTodos(db, aliceId, { due: 'week' });
    expect(list.map((t) => t.title).sort()).toEqual(['t0', 't6']);
  });

  it("过滤：due='overdue' 不含已完成的过期项", () => {
    const { db, aliceId } = bootstrap();
    const a = createTodo(db, aliceId, { title: 'a', dueDate: offsetDate(-1) });
    const b = createTodo(db, aliceId, { title: 'b', dueDate: offsetDate(-2) });
    updateTodo(db, aliceId, b.id, { done: true });
    createTodo(db, aliceId, { title: 'c', dueDate: localToday() }); // 不算过期

    const list = getAllTodos(db, aliceId, { due: 'overdue' });
    expect(list.map((t) => t.id)).toEqual([a.id]);
  });

  it("过滤：due='none' 命中 dueDate 为 null", () => {
    const { db, aliceId } = bootstrap();
    createTodo(db, aliceId, { title: 'a' });
    createTodo(db, aliceId, { title: 'b', dueDate: offsetDate(1) });

    const list = getAllTodos(db, aliceId, { due: 'none' });
    expect(list.map((t) => t.title)).toEqual(['a']);
  });
```

- [ ] **Step 2: 跑测试看到失败**

Run: `cd server && npx vitest run tests/services.todos.test.ts -t "过滤：due"`
Expected: 4 FAIL。

- [ ] **Step 3: 在 services/todos.ts 顶部加日期工具，并在 getAllTodos 追加 due 四桶**

先在 `server/src/services/todos.ts` 中 `ORDER_BY` 常量下方加：

```ts
// 服务器本地日期 YYYY-MM-DD
function today(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
```

然后在 `getAllTodos` 内 `if (filters.priority) ...` 之后追加：

```ts
  if (filters.due === 'today') {
    where.push('due_date = ?');
    params.push(today());
  }
  if (filters.due === 'week') {
    where.push('due_date BETWEEN ? AND ?');
    params.push(today(), addDays(today(), 6));
  }
  if (filters.due === 'overdue') {
    where.push('due_date < ? AND done = 0');
    params.push(today());
  }
  if (filters.due === 'none') {
    where.push('due_date IS NULL');
  }
```

- [ ] **Step 4: 跑测试看到通过**

Run: `cd server && npx vitest run tests/services.todos.test.ts -t "过滤：due"`
Expected: 4 PASS。

- [ ] **Step 5: 提交**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/src/services/todos.ts ch08_rebuild_todolist/server/tests/services.todos.test.ts
git commit -m "feat(stage4): listTodos 支持 due 四桶过滤（today/week/overdue/none）"
```

---

## Task 5: filters —— q 标题搜索

**Files:**
- Modify: `server/src/services/todos.ts`
- Test: `server/tests/services.todos.test.ts`

- [ ] **Step 1: 写失败测试**

在 `services.todos.test.ts` 末尾追加：

```ts
  it("过滤：q 不区分大小写匹配 title", () => {
    const { db, aliceId } = bootstrap();
    createTodo(db, aliceId, { title: 'Read Book' });
    createTodo(db, aliceId, { title: 'write code' });

    const list = getAllTodos(db, aliceId, { q: 'BOOK' });
    expect(list.map((t) => t.title)).toEqual(['Read Book']);
  });

  it("过滤：q 中的 % 转义后匹配字面量", () => {
    const { db, aliceId } = bootstrap();
    createTodo(db, aliceId, { title: '完成 50% 进度' });
    createTodo(db, aliceId, { title: '完成 30 件事' });

    const list = getAllTodos(db, aliceId, { q: '50%' });
    expect(list.map((t) => t.title)).toEqual(['完成 50% 进度']);
  });
```

- [ ] **Step 2: 跑测试看到失败**

Run: `cd server && npx vitest run tests/services.todos.test.ts -t "过滤：q"`
Expected: 2 FAIL（filter 未生效，全量返回）。

- [ ] **Step 3: 在 services/todos.ts 顶部加 escapeLike 工具，并在 getAllTodos 追加 q 分支**

先在 `server/src/services/todos.ts` 的日期工具下方追加：

```ts
// 转义 LIKE 中的特殊字符（必须先转 \，再转 % 和 _）
function escapeLike(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
```

然后在 `getAllTodos` 内 `if (filters.due === 'none') ...` 之后追加：

```ts
  if (filters.q) {
    where.push(`LOWER(title) LIKE LOWER(?) ESCAPE '\\'`);
    params.push(`%${escapeLike(filters.q)}%`);
  }
```

- [ ] **Step 4: 跑测试看到通过**

Run: `cd server && npx vitest run tests/services.todos.test.ts -t "过滤：q"`
Expected: 2 PASS。

- [ ] **Step 5: 提交**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/src/services/todos.ts ch08_rebuild_todolist/server/tests/services.todos.test.ts
git commit -m "feat(stage4): listTodos 支持 q 标题模糊搜索"
```

---

## Task 6: AND 组合 + 用户隔离测试

**Files:**
- Test: `server/tests/services.todos.test.ts`

- [ ] **Step 1: 追加组合测试**

在末尾追加：

```ts
  it("过滤：done + priority + q 多条件 AND", () => {
    const { db, aliceId } = bootstrap();
    const a = createTodo(db, aliceId, { title: '写课件 A', priority: 3 });
    const b = createTodo(db, aliceId, { title: '写课件 B', priority: 3 });
    updateTodo(db, aliceId, b.id, { done: true });
    createTodo(db, aliceId, { title: '写课件 C', priority: 1 });
    createTodo(db, aliceId, { title: '买菜', priority: 3 });

    const list = getAllTodos(db, aliceId, {
      done: 'active',
      priority: 3,
      q: '课件',
    });
    expect(list.map((t) => t.id)).toEqual([a.id]);
  });

  it("过滤：用户隔离不破（A 的 filter 不会命中 B 的）", () => {
    const { db, aliceId, bobId } = bootstrap();
    createTodo(db, aliceId, { title: '工作 A', category: '工作' });
    createTodo(db, bobId, { title: '工作 B', category: '工作' });

    const list = getAllTodos(db, aliceId, { category: '工作' });
    expect(list.map((t) => t.title)).toEqual(['工作 A']);
  });
```

- [ ] **Step 2: 跑测试看到通过（已实现的逻辑应该直接 PASS）**

Run: `cd server && npx vitest run tests/services.todos.test.ts -t "过滤：(多条件|用户隔离)"`
Expected: 2 PASS。

- [ ] **Step 3: 全量测试**

Run: `cd server && npm test`
Expected: 全部 PASS。

- [ ] **Step 4: 提交**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/tests/services.todos.test.ts
git commit -m "test(stage4): listTodos 多条件 AND 与用户隔离覆盖"
```

---

## Task 7: 路由层解析 query + 校验

**Files:**
- Modify: `server/src/routes/todos.ts`
- Test: `server/tests/routes.todos.test.ts`

- [ ] **Step 1: 写失败测试（路由层）**

在 `server/tests/routes.todos.test.ts` 的 `describe('todos routes', () => {` 内末尾追加：

```ts
  it("GET /api/todos?done=active 只返回未完成", async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const a = await agent.post('/api/todos').send({ title: 'a' });
    const b = await agent.post('/api/todos').send({ title: 'b' });
    await agent.patch(`/api/todos/${b.body.id}`).send({ done: true });

    const res = await agent.get('/api/todos?done=active');
    expect(res.status).toBe(200);
    expect(res.body.map((t: { id: number }) => t.id)).toEqual([a.body.id]);
  });

  it("GET /api/todos?priority=invalid → 400", async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent.get('/api/todos?priority=invalid');
    expect(res.status).toBe(400);
  });

  it("GET /api/todos?due=tomorrow → 400", async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent.get('/api/todos?due=tomorrow');
    expect(res.status).toBe(400);
  });

  it("GET /api/todos?done=maybe → 400", async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent.get('/api/todos?done=maybe');
    expect(res.status).toBe(400);
  });

  it("GET /api/todos 综合 query → 200 AND", async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const a = await agent
      .post('/api/todos')
      .send({ title: '写课件', priority: 3, category: '工作' });
    await agent.post('/api/todos').send({ title: '买菜', priority: 3 });
    await agent.post('/api/todos').send({ title: '写课件 done', priority: 3 });

    const res = await agent.get(
      '/api/todos?done=active&priority=3&q=' + encodeURIComponent('课件') + '&category=' + encodeURIComponent('工作')
    );
    expect(res.status).toBe(200);
    expect(res.body.map((t: { id: number }) => t.id)).toEqual([a.body.id]);
  });
```

- [ ] **Step 2: 跑测试看到失败**

Run: `cd server && npx vitest run tests/routes.todos.test.ts -t "GET /api/todos\\?"`
Expected: 5 FAIL（路由忽略 query，要么全量返回 200，要么 priority=invalid 不返回 400）。

- [ ] **Step 3: 改路由 GET 处理 query**

把 `server/src/routes/todos.ts` 中 `router.get('/', ...)` 替换为：

```ts
  router.get('/', (req: Request, res: Response) => {
    const filters: ListFilters = {};

    const done = req.query.done;
    if (done !== undefined) {
      if (done !== 'active' && done !== 'done') {
        res.status(400).json({ error: 'done 必须是 active 或 done' });
        return;
      }
      filters.done = done;
    }

    const category = req.query.category;
    if (typeof category === 'string' && category.trim()) {
      filters.category = category;
    }

    const priority = req.query.priority;
    if (priority !== undefined) {
      if (priority !== '1' && priority !== '2' && priority !== '3') {
        res.status(400).json({ error: 'priority 必须是 1/2/3' });
        return;
      }
      filters.priority = Number(priority) as 1 | 2 | 3;
    }

    const due = req.query.due;
    if (due !== undefined) {
      if (
        due !== 'today' &&
        due !== 'week' &&
        due !== 'overdue' &&
        due !== 'none'
      ) {
        res.status(400).json({ error: 'due 非法' });
        return;
      }
      filters.due = due;
    }

    const q = req.query.q;
    if (typeof q === 'string' && q.length > 0) {
      filters.q = q;
    }

    res.json(getAllTodos(db, userId(req), filters));
  });
```

并在文件顶部 import 中加上 `ListFilters`：

```ts
import type { ListFilters } from '../types';
```

- [ ] **Step 4: 跑测试看到通过**

Run: `cd server && npx vitest run tests/routes.todos.test.ts -t "GET /api/todos\\?"`
Expected: 5 PASS。

- [ ] **Step 5: 全量测试**

Run: `cd server && npm test`
Expected: 全部 PASS。

- [ ] **Step 6: 提交**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/server/src/routes/todos.ts ch08_rebuild_todolist/server/tests/routes.todos.test.ts
git commit -m "feat(stage4): GET /api/todos 接受 done/category/priority/due/q 五个 query"
```

---

## Task 8: 前端 api.ts 支持 filters

**Files:**
- Modify: `client/src/api.ts`

- [ ] **Step 1: 改 fetchTodos 接受 Filters 并拼 query**

把 `client/src/api.ts` 中的 `fetchTodos` 替换为：

```ts
export interface Filters {
  done: 'all' | 'active' | 'done';
  category: string;
  priority: '' | '1' | '2' | '3';
  due: '' | 'today' | 'week' | 'overdue' | 'none';
  q: string;
}

export async function fetchTodos(filters?: Filters): Promise<Todo[]> {
  const qs = filters ? buildQueryString(filters) : '';
  return handle<Todo[]>(await authedFetch(`${TODOS}${qs}`));
}

function buildQueryString(f: Filters): string {
  const params = new URLSearchParams();
  if (f.done !== 'all') params.set('done', f.done);
  if (f.category) params.set('category', f.category);
  if (f.priority) params.set('priority', f.priority);
  if (f.due) params.set('due', f.due);
  if (f.q) params.set('q', f.q);
  const s = params.toString();
  return s ? `?${s}` : '';
}
```

- [ ] **Step 2: 编译检查**

Run: `cd client && npx tsc --noEmit`
Expected: 编译报错 —— `TodosPage.tsx` 里 `fetchTodos()` 已有调用是兼容的（参数可选），但 `Filters` 类型新引入还未在 `TodosPage` 使用。这一步只确保 `api.ts` 自身无错。允许 `TodosPage`/`FilterBar` 相关的提示，下一 task 修。

- [ ] **Step 3: 不 commit，留到前端整体跑通后一起**

---

## Task 9: 新建 FilterBar 组件

**Files:**
- Create: `client/src/components/FilterBar.tsx`

- [ ] **Step 1: 创建文件**

写入 `client/src/components/FilterBar.tsx`：

```tsx
import type { Filters } from '../api';

interface Props {
  filters: Filters;
  categories: string[];
  onChange: (next: Filters) => void;
}

const DONE_TABS: { value: Filters['done']; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '未完' },
  { value: 'done', label: '已完' },
];

const PRIORITY_OPTIONS: { value: Filters['priority']; label: string }[] = [
  { value: '', label: '优先级（全部）' },
  { value: '3', label: '🔴 高' },
  { value: '2', label: '🟡 中' },
  { value: '1', label: '🟢 低' },
];

const DUE_OPTIONS: { value: Filters['due']; label: string }[] = [
  { value: '', label: '日期（全部）' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'overdue', label: '已过期' },
  { value: 'none', label: '无日期' },
];

export function FilterBar({ filters, categories, onChange }: Props) {
  function patch(p: Partial<Filters>) {
    onChange({ ...filters, ...p });
  }

  return (
    <div className="flex flex-col gap-2 mb-3">
      <div className="flex gap-1">
        {DONE_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => patch({ done: t.value })}
            className={
              'px-3 py-1 rounded text-sm border ' +
              (filters.done === t.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 hover:bg-gray-100')
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={filters.category}
          onChange={(e) => patch({ category: e.target.value })}
        >
          <option value="">分类（全部）</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={filters.priority}
          onChange={(e) =>
            patch({ priority: e.target.value as Filters['priority'] })
          }
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={filters.due}
          onChange={(e) => patch({ due: e.target.value as Filters['due'] })}
        >
          {DUE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="flex-1 min-w-[8rem] border rounded px-2 py-1 text-sm"
          placeholder="🔍 搜索标题"
          value={filters.q}
          onChange={(e) => patch({ q: e.target.value })}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 编译检查**

Run: `cd client && npx tsc --noEmit`
Expected: `FilterBar.tsx` 自身无错；`TodosPage.tsx` 仍然不报错（FilterBar 还没被引用）。

- [ ] **Step 3: 不 commit，下一 task 接入后一起**

---

## Task 10: TodosPage 接入 FilterBar

**Files:**
- Modify: `client/src/pages/TodosPage.tsx`

- [ ] **Step 1: 替换 TodosPage**

把 `client/src/pages/TodosPage.tsx` 完整替换为：

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Todo } from '../types';
import * as api from '../api';
import type { Filters } from '../api';
import { useAuth } from '../auth/AuthContext';
import { TodoForm, type TodoFormValues } from '../components/TodoForm';
import { TodoList } from '../components/TodoList';
import { FilterBar } from '../components/FilterBar';

const DEFAULT_FILTERS: Filters = {
  done: 'all',
  category: '',
  priority: '',
  due: '',
  q: '',
};

export default function TodosPage() {
  const { user, logout } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // 写操作完成后刷新整个列表，保证排序与最新值一致
  async function refetch() {
    try {
      const list = await api.fetchTodos(filters);
      setTodos(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // 分类下拉选项：从当前列表去重派生
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of todos) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set);
  }, [todos]);

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
        <FilterBar
          filters={filters}
          categories={categories}
          onChange={setFilters}
        />
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

- [ ] **Step 2: 编译检查**

Run: `cd client && npx tsc --noEmit`
Expected: 0 错误。

- [ ] **Step 3: 启动前端，浏览器 smoke**

Run: `cd client && npm run dev`
（前提：后端已 `cd server && npm run dev` 起在 3001）

打开 http://localhost:5173，登录后逐项验证：

1. 顶部出现两行过滤栏：`[全部][未完][已完]` + 三个下拉 + 搜索框
2. 创建若干 todo（含不同 category/priority/dueDate）
3. 点 `已完` → 列表只剩已完成
4. 选 `分类 → 工作` → 只剩工作类
5. 选 `优先级 → 🔴 高` → 只剩高优先级
6. 选 `日期 → 今天` / `本周` / `已过期` / `无日期` 各点一遍，结果合理
7. 搜索框输入若干字符 → 实时过滤
8. 多维度叠加（如 `未完 + 工作 + 高 + 含 "课件"`）
9. 清空所有过滤 → 回到全量列表
10. 添加 / 编辑 / 删除 / 勾选 任一项 → 列表保持当前过滤态

- [ ] **Step 4: 提交**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/client/src/api.ts ch08_rebuild_todolist/client/src/components/FilterBar.tsx ch08_rebuild_todolist/client/src/pages/TodosPage.tsx
git commit -m "feat(stage4): 前端 FilterBar + TodosPage 接入 filters"
```

---

## Task 11: 更新 README 阶段表

**Files:**
- Modify: `ch08_rebuild_todolist/README.md`

- [ ] **Step 1: 把阶段 4 行从 ⏳ 改成 ✅**

打开 `ch08_rebuild_todolist/README.md`，把这一行：

```markdown
| 4 | 过滤 + 搜索 | ⏳ 待开始 | — | — |
```

替换为：

```markdown
| 4 | 过滤 + 搜索 | ✅ 完成 | [link](docs/superpowers/specs/2026-06-13-stage4-filter-search-design.md) | [link](docs/superpowers/plans/2026-06-13-stage4-filter-search-plan.md) |
```

- [ ] **Step 2: 提交**

```bash
cd /Users/xujian/Documents/OldSchoolProgramming/vibe_coding_tutorial
git add ch08_rebuild_todolist/README.md
git commit -m "docs(ch08): 阶段 4 完成"
```

---

## 完成标准

- 后端：所有过滤 + 搜索用例 PASS，全量 `npm test` 通过（旧用例不破）
- 前端：tsc 0 错误；浏览器手动跑完 Task 10 Step 3 的 10 项 smoke
- README 阶段表反映阶段 4 已完成
