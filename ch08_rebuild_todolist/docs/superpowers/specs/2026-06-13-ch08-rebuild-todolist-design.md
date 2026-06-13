# ch08 · 用 AI 重建 TODO List —— 设计文档

- 日期：2026-06-13
- 作者：Jack（与 Claude Code 协作）
- 章节：ch08_rebuild_todolist
- 状态：设计已确认，待写实现 plan

---

## 1. 这一章在做什么

从空目录出发，**完全用 AI 协作**重新做出一份与 ch05 等价的 TODO List，并额外加入 4 个新亮点（拖拽排序 / 过滤搜索 / 深色模式 / 多标签 tags）。

技术栈与 ch05 完全一致：

- 前端：React + TypeScript + Vite + Tailwind
- 后端：Express + TypeScript + better-sqlite3
- 测试：vitest（+ supertest）

**教学主线**：每个阶段都跑完整的 `brainstorm → spec → plan → TDD → 实现 → 验证 → commit` 循环，让学生看到 AI 协作是个有节奏的小循环，而不是「扔一个大需求等结果」。

**成功标准**：

1. 7 个阶段全部完成、能跑的代码
2. 每阶段都有 design + plan 文档落盘并 commit，便于课堂复现与课后回看
3. 后端测试全绿；每阶段前端手动跑通新功能

---

## 2. 目录结构

```
ch08_rebuild_todolist/
├── README.md                      # 章节导览（每阶段进度表 + 链接）
├── docs/
│   └── superpowers/
│       └── specs/
│           ├── 2026-06-13-ch08-rebuild-todolist-design.md   # 本文件
│           ├── 2026-06-13-stage1-mvp-design.md
│           ├── 2026-06-13-stage1-mvp-plan.md
│           └── ... (每阶段一对 design/plan)
├── client/                        # 阶段 1 创建
└── server/                        # 阶段 1 创建
```

`client/` 与 `server/` 在阶段 1 才生成；阶段开头落盘 design + plan 并 commit。

---

## 3. 阶段切分

7 个阶段，独立可演示，可在任意阶段断点续讲。

| # | 阶段 | 范围 | 关键演示点 |
|---|---|---|---|
| 1 | MVP | 增/删/改/查 + SQLite 持久化，单用户、无登录 | 从空目录起步、第一条 TDD、第一次 commit |
| 2 | 登录 + 用户隔离 | 注册 / 登录 / 退出，todos 按 `user_id` 隔离 | 加新表、改老表、迁移阶段 1 老数据 |
| 3 | 分类 + 优先级 + 截止日期 | 三个字段一并加 | schema + API + UI 三层联动 |
| 4 | 过滤 + 搜索 | 状态 / 分类 / 截止日期过滤 + 关键词搜索 | 后端 query 参数设计、前端状态组合 |
| 5 | 拖拽排序 | 持久化到后端 `sort_order` | 引入第三方库（dnd-kit）的取舍与 prompt |
| 6 | 多标签 tags | tags 表 + todo_tags 关联表 + tag 过滤 | 多对多建模、迁移已有 todos |
| 7 | 深色模式 | Tailwind `dark:` + localStorage | 纯前端小特性，节奏放松，复盘整章 |

### 阶段产物（每阶段都要有）

1. `docs/superpowers/specs/YYYY-MM-DD-stageN-<topic>-design.md`
2. `docs/superpowers/specs/YYYY-MM-DD-stageN-<topic>-plan.md`
3. 一组 commit
4. 阶段末更新 `README.md` 的「阶段进度」表

### 进入下一阶段的硬门槛

- 后端 `npm test` 全绿
- 手动跑通该阶段新增的前端交互
- 当前阶段 spec / plan 已 commit

---

## 4. 技术架构

### 前端 `client/`

- React 18 + TypeScript + Vite
- Tailwind（**禁止**引入额外 UI 库——遵循项目根 `CLAUDE.md`）
- 状态管理：`useState` / `useReducer` + Context（登录态）；不引 Redux/Zustand
- HTTP：原生 `fetch` + 一个轻薄的 `client/src/api.ts` 封装
- 路由：React Router（登录页 + 主页两条路由）
- 第三方库按阶段引入：阶段 5 加 `@dnd-kit/core`

### 后端 `server/`

- Express + TypeScript
- better-sqlite3（同步 API，教学清晰）
- 鉴权：bcrypt + JWT（阶段 2 引入），与 ch05 一致
- 测试：vitest + supertest
- 分层（与 ch05 一致）：`routes/` → `services/` → `db/`，每层薄、可单测

### Schema 演进策略

每个阶段直接 `ALTER TABLE` 加列；**不引专门的迁移工具**——课堂上手写 SQL 演进，更直观。每次 schema 变化都在阶段 spec 里写明「老数据怎么办」。

---

## 5. 数据模型（阶段 6 完成后的最终形态）

```sql
users (
  id            INTEGER PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

todos (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0,         -- 0/1
  category    TEXT,                               -- 阶段 3
  priority    INTEGER,                            -- 阶段 3 (1=低 2=中 3=高)
  due_date    TEXT,                               -- 阶段 3 (ISO date 或 NULL)
  sort_order  INTEGER NOT NULL DEFAULT 0,         -- 阶段 5
  created_at  TEXT NOT NULL
);

tags (                                            -- 阶段 6
  id      INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name    TEXT NOT NULL,
  UNIQUE(user_id, name)
);

todo_tags (                                       -- 阶段 6
  todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (todo_id, tag_id)
);
```

阶段 1 时只有 `todos`，且无 `user_id`、`category`、`priority`、`due_date`、`sort_order`。

---

## 6. API 形态（最终）

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/todos?status=&category=&q=&tag=
POST   /api/todos
PATCH  /api/todos/:id
DELETE /api/todos/:id
PATCH  /api/todos/reorder            # 阶段 5

GET    /api/tags                     # 阶段 6
POST   /api/tags
DELETE /api/tags/:id
```

阶段 1 时 `/api/todos` 不带任何过滤参数，也不要求登录；后续阶段逐步加上。

`?tag=` 的具体语义（单 tag 过滤 / 多 tag 与或关系 / 是否支持 tag id 还是 tag name）留到阶段 6 的 spec 决定。`PATCH /api/todos/reorder` 的请求体形态留到阶段 5 的 spec 决定。

---

## 7. 测试策略（TDD 风格驱动）

### TDD 节奏

每阶段的 plan 里把功能切成若干小步，每一步都遵循：

1. 写一个失败的测试
2. 跑测试 → 看红
3. 写最少代码让它绿
4. 重构
5. commit

**每个阶段开头安排一次完整的 Red-Green-Refactor 演示步骤**，让学生看到 1→5 一次完整循环；后续步骤可加快节奏，但 plan 里仍要求「先测后码」。

### 测试范围

| 层 | 工具 | 覆盖 |
|---|---|---|
| 后端 services | vitest | 业务逻辑全覆盖（增删改查、过滤、排序、权限） |
| 后端 routes | vitest + supertest | 关键路径（鉴权、错误码、参数校验） |
| 后端 db | 不直接测 | 通过 services 间接覆盖 |
| 前端组件 | 不强制 | ch06 已讲过测试；ch08 不增前端测试负担 |

前端验证靠手动启动 dev server 跑一跑。

### 测试数据隔离

- 每个测试文件用独立的 `:memory:` SQLite 实例
- 不读真实文件、不依赖测试顺序
- 在 `server/tests/setup.ts` 里统一建表

---

## 8. 范围之外（YAGNI）

ch08 **不**包含以下内容，避免冲淡「AI 协作流程」主线：

- 前端组件单元测试（留给 ch06 风格的延伸）
- 数据库迁移工具（如 Prisma / Drizzle）
- 部署 / CI / Docker
- 国际化、可访问性深度优化
- 实时同步（WebSocket）
- 子任务、附件、提醒推送等额外功能

---

## 9. 风险与备选

| 风险 | 处理 |
|---|---|
| 7 个阶段课堂讲不完 | 阶段独立可断点，任何阶段结束都可作为「这一章到此为止」 |
| TDD 节奏拖慢演示 | 每阶段只在开头做一次完整 R-G-R，后续步骤合并讲 |
| AI 生成代码与 ch05 风格不一致 | 在每阶段 spec 里点名「目录命名 / 分层」要求；不强求逐字一致 |
| 拖拽库选择 | 默认 `@dnd-kit/core`；课堂可改成 `react-beautiful-dnd` 或手写 |

---

## 10. 下一步

按 `superpowers:writing-plans` skill 为**阶段 1（MVP）**单独写一份实现 plan：

`docs/superpowers/specs/2026-06-13-stage1-mvp-plan.md`

后续每个阶段开始前，都重复 brainstorm-design-plan 流程，**不一次性写完所有阶段的 plan**——这样每个阶段都能基于前一阶段的真实结果调整。
