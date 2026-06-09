# TODO List 应用技术方案与项目规划

> 状态：✅ 已落地实现，代码在 `ch05_manual_todolist/todolist/`

## 一、技术栈选型

### 前端（client/）
- **React 18** + **TypeScript** + **Vite**（快速构建）
- **Tailwind CSS**（按 CLAUDE.md 要求，不引入额外 UI 库）
- **fetch API**（原生，无需 axios）

### 后端（server/）
- **Express** + **TypeScript**
- **better-sqlite3**（同步 API，简单高效）
- **cors** 中间件（处理跨域）
- **tsx**（开发热重载）
- **dotenv**(读取 `.env`)

### 数据库
- SQLite 单文件存储（`server/data/todos.db`）

---

## 二、项目目录结构（实际落地）

```
ch05_manual_todolist/todolist/
├── README.md                        # 项目说明、启动方式、API
│
├── client/                          # 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── TodoInput.tsx        # 输入框 + 添加按钮
│   │   │   ├── TodoItem.tsx         # 单项（勾选框 + 标题 + 删除）
│   │   │   └── TodoList.tsx         # 列表 + 空态提示
│   │   ├── api/
│   │   │   └── todoApi.ts           # fetch 封装（含错误处理)
│   │   ├── types/
│   │   │   └── todo.ts              # Todo 类型
│   │   ├── App.tsx                  # 串联数据加载与增删改
│   │   ├── main.tsx
│   │   └── index.css                # Tailwind 入口
│   ├── index.html
│   ├── vite.config.ts               # 含 /api → :3001 proxy（勿改）
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── package.json
│   └── .gitignore
│
└── server/                          # 后端
    ├── src/
    │   ├── routes/
    │   │   └── todos.ts             # /api/todos 路由（4 个接口）
    │   ├── types/
    │   │   └── todo.ts              # 共享类型
    │   ├── db.ts                    # SQLite 连接 + 建表 + 增删改查
    │   ├── app.ts                   # Express 应用配置
    │   └── index.ts                 # 启动入口
    ├── data/
    │   └── todos.db                 # SQLite 文件（gitignore）
    ├── .env.example                 # 勿删
    ├── tsconfig.json
    ├── package.json
    └── .gitignore
```

> 说明：实际落地时把后端的 `db/index.ts` + `db/schema.sql` 合并为单个 `db.ts`（建表 SQL 内联），更紧凑。

---

## 三、数据模型

**Todo 表**：

| 字段       | 类型                              | 说明                |
| ---------- | --------------------------------- | ------------------- |
| id         | INTEGER PRIMARY KEY AUTOINCREMENT | 主键                |
| title      | TEXT NOT NULL                     | 待办内容            |
| completed  | INTEGER NOT NULL DEFAULT 0        | 完成状态（0/1）     |
| created_at | TEXT NOT NULL                     | 创建时间 ISO 字符串 |

> 字段命名采用蛇形 `created_at`（贴近 SQLite 习惯）；前后端类型同步。

**排序规则**：未完成在上、已完成在下，组内按创建时间倒序：

```sql
SELECT * FROM todos ORDER BY completed ASC, created_at DESC;
```

---

## 四、RESTful API 设计

| 方法   | 路径             | 功能                              | 请求体                       | 成功返回             |
| ------ | ---------------- | --------------------------------- | ---------------------------- | -------------------- |
| GET    | `/api/todos`     | 获取所有待办（已排序）            | -                            | `Todo[]`             |
| POST   | `/api/todos`     | 添加待办                          | `{ title }`                  | `201` + `Todo`       |
| PATCH  | `/api/todos/:id` | **通用部分更新**（改文字 / 切换） | `{ title?, completed? }`     | `Todo`               |
| DELETE | `/api/todos/:id` | 删除待办                          | -                            | `{ success: true }`  |

**错误响应**：
- 空 title / 字段类型不对 → `400`
- 找不到记录 → `404`

> 关键决定：`PATCH` 做成**通用部分更新**，`title` 和 `completed` 都可选、传哪个改哪个。一个接口同时支持「打钩」和「改文字」，避免再加 `/toggle` 一类的专用端点。

---

## 五、前后端联调方式

通过 Vite 的 **proxy** 配置：前端请求 `/api/*` → 自动转发到后端 `http://localhost:3001`，避免 CORS 并简化 fetch 调用（`fetch('/api/todos')`）。

---

## 六、UI 关键细节

- **完成态**：`line-through text-gray-400`，未完成 `text-gray-800`
- **删除按钮**：默认隐藏，行 hover 时浮现（`group-hover:opacity-100`）
- **空态**：`还没有待办，加一条吧～`
- **加载/错误**：顶部红色错误条可关闭；首屏 loading 文案
- **添加 / 切换**：调用后端后**重拉列表**，保证排序与后端一致（已完成自动沉底）
- **删除**：本地直接 filter，无需重拉

---

## 七、开发步骤（已完成 1–5）

1. ✅ **搭骨架**：`client/` 和 `server/` 初始化，配好 TS、Tailwind、Vite proxy
2. ✅ **数据库层**：`server/src/db.ts` 完成建表 + 4 个增删改查函数
3. ✅ **API 路由**：`server/src/routes/todos.ts` 实现 4 个接口 + 参数校验
4. ✅ **前端 API 层 & 类型**：`todoApi.ts` 封装 + 类型定义
5. ✅ **UI 组件**：`TodoInput` / `TodoItem` / `TodoList` / `App` 全部就绪
6. ⏳ **打磨与扩展**（可选）：双击编辑标题、Esc 取消、键盘快捷键、过滤器（全部 / 未完成 / 已完成）

---

## 八、启动方式

```bash
# 后端
cd todolist/server
cp .env.example .env
npm install
npm run dev          # http://localhost:3001

# 前端（另开终端）
cd todolist/client
npm install
npm run dev          # http://localhost:5173
```
