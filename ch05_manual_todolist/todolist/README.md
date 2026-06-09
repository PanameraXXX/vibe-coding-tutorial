# TODO List

一个前后端分离的待办清单应用。

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS
- **后端**：Express + TypeScript + better-sqlite3
- **数据库**：SQLite（单文件，位于 `server/data/todos.db`，自动创建）

---

## 功能

- ✅ 添加 / 删除 / 切换完成状态
- ✅ 已完成的待办自动沉到底部、加删除线
- ✅ 同一接口支持改文字 + 切换完成（`PATCH` 通用部分更新）
- ✅ Vite proxy 解决跨域，前端用相对路径 `/api/*`

---

## 项目结构

```
todolist/
├── package.json           # 根脚本：一键启动前后端
├── README.md
├── .gitignore
│
├── client/                # 前端（React + Vite）
│   ├── src/
│   │   ├── api/todoApi.ts         # fetch 封装
│   │   ├── components/
│   │   │   ├── TodoInput.tsx      # 添加输入框
│   │   │   ├── TodoItem.tsx       # 单项（勾选 + 删除）
│   │   │   └── TodoList.tsx       # 列表 + 空态
│   │   ├── types/todo.ts          # Todo 类型
│   │   ├── App.tsx                # 主组件
│   │   ├── main.tsx
│   │   └── index.css              # Tailwind 入口
│   ├── vite.config.ts             # /api → :3001 代理
│   └── package.json
│
└── server/                # 后端（Express + SQLite）
    ├── src/
    │   ├── db.ts                  # 数据库初始化 + CRUD
    │   ├── routes/todos.ts        # /api/todos 路由
    │   ├── types/todo.ts
    │   ├── app.ts                 # Express 配置
    │   └── index.ts               # 启动入口
    ├── data/                      # SQLite 文件（gitignored）
    ├── .env.example
    └── package.json
```

---

## 安装

确保已装 **Node.js ≥ 18**。

```bash
cd todolist
npm install                # 装根目录的 concurrently
npm run install:all        # 装 client/ 和 server/ 的依赖
```

复制后端环境变量模板：

```bash
cp server/.env.example server/.env
```

---

## 启动

### 一键同时启动前后端（推荐）

```bash
npm run dev
```

- 后端：http://localhost:3001
- 前端：http://localhost:5173

### 单独启动（调试时用）

```bash
npm run dev:server   # 只启后端
npm run dev:client   # 只启前端
```

---

## API

| 方法   | 路径             | 说明                                | 请求体                       |
| ------ | ---------------- | ----------------------------------- | ---------------------------- |
| GET    | `/api/todos`     | 获取所有待办（未完成在上）          | -                            |
| POST   | `/api/todos`     | 新建待办                            | `{ title }`                  |
| PATCH  | `/api/todos/:id` | 部分更新（改文字 / 切换完成）       | `{ title?, completed? }`     |
| DELETE | `/api/todos/:id` | 删除待办                            | -                            |

**Todo 字段**：`id | title | completed | created_at`

---

## 常见问题

**Q: 浏览器报 `Access to fetch blocked by CORS`？**
A: 前端代码里别写完整 URL `http://localhost:3001/...`，只用相对路径 `/api/...`，Vite proxy 才会生效。

**Q: 想清空数据怎么办？**
A: 删除 `server/data/todos.db` 后重启后端即可（启动时会自动建表）。

**Q: 端口被占用？**
A: 后端端口在 `server/.env` 改 `PORT`；前端端口在 `client/vite.config.ts` 改 `server.port`，同时把后端的端口同步更新到 `vite.config.ts` 的 `proxy.target`。
