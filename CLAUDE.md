# 项目：TODO List（待办清单）

## 技术栈
- 前端：React + TypeScript + Vite
- 后端：Express + TypeScript
- 数据库：SQLite（better-sqlite3）

## 代码规范
- 使用中文注释
- 函数命名采用 camelCase
- 组件命名采用 PascalCase
- 禁止使用 any 类型

## 常用命令
- 启动后端：cd server && npm run dev
- 启动前端：cd client && npm run dev
- 运行测试：npm test

## 注意事项
- 不要删除 .env.example
- 不要新增 UI 组件库（统一使用 Tailwind）
- 不要修改 vite.config.ts 中的 proxy 配置