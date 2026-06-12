# ch09 · 阶段 1（MVP）—— 设计文档

- 日期：2026-06-13
- 作者：Jack（与 Claude Code 协作）
- 章节：ch09_rebuild_todolist · 阶段 1
- 状态：设计已确认，待写实现 plan
- 上游 spec：[2026-06-13-ch09-rebuild-todolist-design.md](./2026-06-13-ch09-rebuild-todolist-design.md)

---

## 1. 阶段范围

阶段 1 是整章的起点：从空目录搭出一份**可跑的最小 TODO List**，专注「前后端打通 + 持久化」这一件事。

**只做：**

- 后端：Express + better-sqlite3，提供 todos 的增删改查
- 前端：单页 React + Tailwind，输入框 + 列表 + 每条三个按钮（完成切换 / 编辑 / 删除）
- 数据落 SQLite 文件，重启后还在
- 后端 service 层 + route 层的 TDD 套件

**不做（明确推到后续阶段）：**

- 登录 / 用户隔离 → 阶段 2
- 分类 / 优先级 / 截止日期 → 阶段 3
- 任何过滤、搜索、排序参数（`status` / `category` / `q` / `tag` 全无） → 阶段 4 起
- 拖拽排序、tags、深色模式 → 阶段 5/6/7
- 前端组件测试（参考上游 spec §7：ch09 不增前端测试负担）

阶段 1 的目标是「跑起来 + 第一次完整 TDD 循环」，不是「功能多」。

---

## 2. 后端 schema

参照上游 spec §5，阶段 1 时 `todos` 表只有 4 个字段，**没有 `user_id`**：

```sql
todos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0,   -- 0/1
  created_at TEXT    NOT NULL              -- ISO 字符串
);
```

阶段 2 引入登录时再 `ALTER TABLE todos ADD COLUMN user_id ...`，并按上游 spec §4「Schema 演进策略」迁移老数据。**阶段 1 是首次建表，不存在遗留数据**——见 §6。

DB 文件路径：`server/data/todos.db`（开发环境）；测试用 `:memory:`。

---

## 3. API

参照上游 spec §6，阶段 1 时 `/api/todos` **不带任何过滤参数，也不要求登录**：

| 方法 | 路径 | 请求体 | 响应 |
|---|---|---|---|
| GET    | `/api/todos`      | —                          | `200 [{id,title,done,created_at}, ...]` |
| POST   | `/api/todos`      | `{ title: string }`        | `201 {id,title,done,created_at}` |
| PATCH  | `/api/todos/:id`  | `{ title?, done? }`        | `200 {id,title,done,created_at}` |
| DELETE | `/api/todos/:id`  | —                          | `204` |

错误约定：

- `title` 缺失或非字符串 → `400 { error }`
- `:id` 不存在 → `404 { error }`
- `done` 在 JSON 里用 boolean，DB 里存 0/1，由 service 层转

后续阶段才会加：query 参数（阶段 4）、`PATCH /api/todos/reorder`（阶段 5）、`/api/auth/*`（阶段 2）、`/api/tags`（阶段 6）。

---

## 4. 前端

**单页**，无路由（阶段 2 引入登录页时再加 React Router）。

页面结构：

- 顶部：输入框 + 「添加」按钮
- 列表：每条一行，包含
  - 复选框：切换 `done`（调 `PATCH`）
  - 标题文本：双击进入编辑态，回车保存（调 `PATCH`），Esc 取消
  - 删除按钮：调 `DELETE` 后从列表移除

样式用 Tailwind。状态用 `useState`，HTTP 调 `client/src/api.ts` 里封装的 `fetch`。**不引第三方 UI 库**（遵循根 `CLAUDE.md`）。

阶段 1 暂不做骨架屏 / loading 动画 / 错误 toast，请求失败先 `console.error` 即可——课堂上手动跑通比好看更重要。

---

## 5. 测试范围

参照上游 spec §7，阶段 1 写两层测试，**前端不写**：

| 层 | 工具 | 覆盖 |
|---|---|---|
| 后端 services（`todoService`） | vitest | 增 / 删 / 改 / 查 4 条主路径，外加边界（编辑不存在的 id、空 title） |
| 后端 routes（`/api/todos`）   | vitest + supertest | 4 个 endpoint 的 happy path + 400/404 错误码 |
| 后端 db                       | 不直测 | 通过 service 间接覆盖 |
| 前端                          | 不写测试 | 手动跑 `npm run dev` 验收 |

每个测试文件用独立的 `:memory:` SQLite 实例，建表逻辑放 `server/tests/setup.ts`。

阶段 1 是整章第一次 TDD，plan 里要把第一条用例（比如「`createTodo` 能插入一条记录」）拆成完整的 Red → Green → Refactor 五步演示给学生看。

---

## 6. 老数据怎么办

**阶段 1 是整个项目的首次建表，没有遗留数据**——空目录起步、新 DB 文件、新 schema，不需要迁移。

这条后续每个阶段的 design 都会单独写一节（上游 spec §4 的硬要求），阶段 1 之所以"无"是因为它就是起点。

---

## 7. 完成标准

- 后端 `npm test` 全绿（services + routes 两层）
- 手动跑通：在浏览器里能添加、勾选、编辑、删除 todo，刷新页面后数据还在
- 本阶段的 design + plan 已 commit
- README.md 的「阶段进度」表勾上阶段 1
