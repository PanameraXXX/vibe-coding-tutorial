# ch09 · 阶段 2（登录 + 用户隔离）—— 设计文档

- 日期：2026-06-13
- 作者：Jack（与 Claude Code 协作）
- 章节：ch09_rebuild_todolist · 阶段 2
- 状态：设计已确认，待写实现 plan
- 上游 spec：[2026-06-13-ch09-rebuild-todolist-design.md](./2026-06-13-ch09-rebuild-todolist-design.md)
- 前置阶段：[2026-06-13-stage1-mvp-design.md](./2026-06-13-stage1-mvp-design.md)

---

## 1. 阶段范围

阶段 2 在阶段 1 的 MVP 基础上加入**注册 / 登录 / 退出**，并把 `todos` 按 `user_id` 隔离。

**只做：**

- 后端：新增 `users` 表 + bcryptjs 密码哈希 + express-session 会话；4 个 auth 端点
- 后端：`todos` 加 `user_id` 列，所有 CRUD 都按当前登录用户过滤
- 前端：引入 React Router；登录页 + todos 页两个路由，未登录守卫
- AuthContext 持 `{ user, loading, login, register, logout }`；启动时 `GET /me` 探活
- 测试：services + routes 全测，含跨用户隔离

**不做（推到后续阶段）：**

- 用户名/密码长度、强度等校验 —— 与 ch05 一致，允许任意注册
- 重置密码、邮箱验证、个人资料页
- 分类 / 优先级 / 截止日期（→ 阶段 3）
- 任何过滤、搜索（→ 阶段 4 起）
- 错误 toast / 骨架屏

进入下一阶段（阶段 3）的硬门槛：后端 `npm test` 全绿、能在浏览器里注册-登录-退出-切换用户验证 todo 隔离、阶段 2 spec/plan 已 commit。

---

## 2. 鉴权机制

与 ch05 完全一致：`express-session` + `better-sqlite3-session-store`。

- session 写到与 todos 同一个 SQLite 文件里的 `sessions` 表，由 store 自动建/管理
- cookie：`httpOnly: true`、`sameSite: 'lax'`、`maxAge: 7 * 24 * 60 * 60 * 1000`（7 天）
- `secret`：`process.env.SESSION_SECRET`，开发兜底 `'dev-secret-change-me'`
- session 内容：仅 `userId: number`
- 扩展类型：`declare module 'express-session' { interface SessionData { userId: number; } }` 合并到 `server/src/types.ts` 末尾

CORS：阶段 1 的 `cors()` 默认值不够，必须改为 `cors({ origin: true, credentials: true })`，否则浏览器不会带 cookie。

> 注：上游 spec §4 文字写的是「bcrypt + JWT」，阶段 2 实际选 session+cookie，与 ch05 实现保持一致；这是已确认的偏离。

---

## 3. 后端 schema 与老数据

### 3.1 新表 `users`

```sql
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL
);
```

### 3.2 改 `todos`：加 `user_id`

```sql
ALTER TABLE todos ADD COLUMN user_id INTEGER NOT NULL REFERENCES users(id);
```

阶段 2 阶段最终 `todos` schema：

```sql
todos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL,
  user_id    INTEGER NOT NULL REFERENCES users(id)
);
```

### 3.3 老数据策略：直接清空

阶段 1 演示时在 `server/data/todolist.sqlite` 留下了几条没有 `user_id` 的 todo。阶段 2 启动迁移时**直接 `DELETE FROM todos;` 全部清掉**，再 ALTER。理由：

- SQLite 不支持给已有非空表加 NOT NULL 列（除非给 DEFAULT），清空表后 ALTER 是最干净的写法
- 阶段 1 的几条 todo 是课堂演示数据，丢失不构成损失
- 课堂上明确告诉学生「这是 schema 演进里最简单的策略，真实项目要选别的」，是个有用的对照点

### 3.4 在 `db/schema.ts` 里的演进逻辑

`initSchema(db)` 按顺序：

1. `CREATE TABLE IF NOT EXISTS users (...)`
2. `CREATE TABLE IF NOT EXISTS todos (id, title, done, created_at, user_id INTEGER NOT NULL REFERENCES users(id))` —— 对**新库**直接生效
3. 用 `PRAGMA table_info(todos)` 检查列名集合：如果不含 `user_id`，说明是阶段 1 老库，则：
   - `DELETE FROM todos;`
   - `ALTER TABLE todos ADD COLUMN user_id INTEGER NOT NULL REFERENCES users(id);`

`:memory:` 测试库每次新建，永远走分支 2，不会触发 ALTER。

---

## 4. API

### 4.1 Auth（不需要登录）

| 方法 | 路径 | 请求体 | 响应 |
|---|---|---|---|
| POST | `/api/auth/register` | `{ username, password }` | `201 { id, username, createdAt }` 并写入 session |
| POST | `/api/auth/login` | `{ username, password }` | `200 { id, username, createdAt }` |
| POST | `/api/auth/logout` | — | `204` |
| GET | `/api/auth/me` | — | `200 { id, username, createdAt }` 或 `401` |

错误约定：

- `username` 或 `password` 缺失/非字符串/空字符串 → `400 { error }`
- 注册时 `username` 已存在 → `409 { error: '用户名已被占用' }`
- 登录账号不存在 **或** 密码错误 → `401 { error: '账号或密码错误' }`（不区分，避免泄露用户名是否存在）

### 4.2 Todos（要求登录）

形态与阶段 1 完全一致，但全部走 `requireAuth` 中间件，且 service 层加 `userId` 参数：

| 方法 | 路径 | 请求体 | 响应 |
|---|---|---|---|
| GET | `/api/todos` | — | `200 [...]`（仅当前用户） |
| POST | `/api/todos` | `{ title }` | `201 {id,title,done,createdAt}` |
| PATCH | `/api/todos/:id` | `{ title?, done? }` | `200 {...}` |
| DELETE | `/api/todos/:id` | — | `204` |

未登录访问 `/api/todos/*` → `401 { error: '请先登录' }`。

跨用户访问统一返回 `404`（视为「对当前用户不存在」），不暴露资源是否真实存在。

### 4.3 装配顺序（`app.ts`）

```
cors({ origin: true, credentials: true })
  → express.json()
  → session(...)
  → /api/auth        (不要求登录)
  → requireAuth
  → /api/todos       (要求登录)
```

---

## 5. 后端文件结构

```
server/src/
├── app.ts                         # 改：cors credentials + session + auth 路由 + requireAuth
├── index.ts                       # 不动（仍然 openDatabase + createApp + listen）
├── types.ts                       # 改：加 User / CreateUserInput；末尾 declare SessionData.userId
├── db/
│   ├── connection.ts              # 不动
│   └── schema.ts                  # 改：3.4 节的演进逻辑
├── middleware/
│   └── requireAuth.ts             # 新
├── services/
│   ├── users.ts                   # 新：createUser / getUserByName / getUserById / verifyPassword
│   └── todos.ts                   # 改：每个函数加 userId 参数
└── routes/
    ├── auth.ts                    # 新：4 endpoints
    └── todos.ts                   # 改：从 req.session.userId 取 userId 传给 service
```

`services/users.ts` 接口：

```ts
createUser(db, input: { username, password }): User       // 返回不含 password_hash 的 User
getUserByName(db, username): UserRow | null               // 含 password_hash，仅供 login
getUserById(db, id): User | null                          // 不含 password_hash
verifyPassword(plain, hash): boolean
```

`services/todos.ts` 改造后接口（全部首参 db，次参 userId）：

```ts
getAllTodos(db, userId): Todo[]
createTodo(db, userId, input): Todo
updateTodo(db, userId, id, input): Todo | null    // 跨用户返回 null
deleteTodo(db, userId, id): boolean               // 跨用户返回 false
```

---

## 6. 前端

### 6.1 新依赖

仅 `react-router-dom@^6` —— 不引第三方 UI 库（遵循根 CLAUDE.md）。

### 6.2 文件结构

```
client/src/
├── main.tsx                       # 改：包 <BrowserRouter><AuthProvider>
├── App.tsx                        # 改：只做路由分发
├── auth/
│   ├── AuthContext.tsx            # 新：useAuth() hook + AuthProvider
│   └── RequireAuth.tsx            # 新：路由守卫
├── pages/
│   ├── LoginPage.tsx              # 新：登录 + 注册（同页 tab 切）
│   └── TodosPage.tsx              # 新：阶段 1 App.tsx 的内容搬过来 + 顶部"你好/退出"
├── components/                    # 不动
├── api.ts                         # 改：authedFetch 包一层 credentials: 'include'；加 register/login/logout/me
└── types.ts                       # 改：加 User
```

### 6.3 AuthContext 形态

```ts
interface AuthState {
  user: User | null;        // null = 未登录或还没探活完
  loading: boolean;         // 初次 GET /me 期间为 true
  login(username, password): Promise<void>;
  register(username, password): Promise<void>;
  logout(): Promise<void>;
}
```

`AuthProvider` 挂载时调一次 `api.me()`：成功 setUser，401 setUser(null)，无论结果都关 loading。

### 6.4 路由

```
/login   → <LoginPage />
/        → <RequireAuth><TodosPage /></RequireAuth>
其他     → <Navigate to="/" replace />
```

`<RequireAuth>`：`loading` 时返回 null（不画骨架屏）；`user === null` 时 `<Navigate to="/login" replace />`；否则渲染 children。

`<LoginPage>` 反向：已登录跳 `/`。

### 6.5 LoginPage

顶部一行两个 tab：「登录」「注册」。下方两个 input（username、password）+ 一个提交按钮。提交成功跳 `/`；失败把错误以红字显示在表单下方（不引 toast）。

### 6.6 TodosPage

阶段 1 `App.tsx` 内容平移，再加：右上角「你好，{username}」+ 「退出」按钮。点退出调 `auth.logout()`，再 `navigate('/login')`。

### 6.7 api.ts 改造

封装 `authedFetch(url, init?)`，统一加 `credentials: 'include'`。阶段 1 的 4 个 todos 函数改用它。新增 4 个 auth 函数：`register / login / logout / me`。

`vite.config.ts` 不改 —— 已有的 `/api → http://localhost:3001` proxy 默认透传 cookie。

---

## 7. 测试

| 层 | 文件 | 覆盖 |
|---|---|---|
| services/users | `tests/services.users.test.ts`（新） | createUser 成功 / 用户名重复抛错 / verifyPassword 正确密码 / verifyPassword 错误密码 / getUserByName 找不到返回 null |
| services/todos | `tests/services.todos.test.ts`（改） | 阶段 1 的 5 条全部加 `userId` 参数；新增「用户 A 看不到用户 B 的 todos」「updateTodo 跨用户返回 null」 |
| routes/auth | `tests/routes.auth.test.ts`（新） | register 201 / 用户名重复 409 / 缺字段 400 / login 200 / 密码错 401 / 不存在 401 / logout 204 / GET /me 未登录 401 / GET /me 已登录 200 |
| routes/todos | `tests/routes.todos.test.ts`（改） | 阶段 1 的 7 条改成「先 register/login，再用 supertest agent 持 cookie 调 todos」；新增「未登录 401」「跨用户 404」 |
| 前端 | — | 仍不写测试 |

预期总数：services (5+7) + routes (9+9) = **30 条**。

测试关键技巧：用 `supertest.agent(app)` 自动维护 cookie jar：

```ts
const agent = request.agent(app);
await agent.post('/api/auth/register').send({ username: 'a', password: 'pw' });
await agent.get('/api/todos');  // 自动带上 cookie
```

每个测试文件仍用独立的 `:memory:` SQLite，建表逻辑共用 `tests/setup.ts`。

---

## 8. 老数据怎么办

阶段 2 是阶段 1 之后第一次 schema 变动，对应策略已在 §3.3、§3.4 写明：**首次启动迁移时清空 todos 表，再 ALTER 加 user_id 列**。

- 测试库（`:memory:`）每次新建，永远是新表，不触发迁移分支
- 开发库 `server/data/todolist.sqlite` 启动时自动迁移；课堂上提醒学生先 `rm` 那个文件也是合理选项
- 后续阶段（阶段 3 加 category/priority/due_date 等列）都不再清数据，那时才演示「真正的 ALTER 不丢数据」

---

## 9. 完成标准

- 后端 `npm test` 全绿（30 条）
- 手动跑通：
  - 注册新用户 alice → 自动登录 → 加 1-2 条 todo → 退出
  - 注册新用户 bob → 加 1-2 条 todo，看不到 alice 的
  - 退出后访问 `/` 自动跳 `/login`；登录后访问 `/login` 自动跳 `/`
  - 刷新浏览器后保持登录态（GET /me 探活生效）
  - 7 天后或服务端清掉 sessions 表后，cookie 失效自动跳 `/login`
- 阶段 2 的 design + plan 已 commit
- README.md 阶段进度表把阶段 2 标 ✅，并补 spec / plan 链接
