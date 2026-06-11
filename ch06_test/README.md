# ch06_test —— todolist 单元测试

为 `ch05_manual_todolist/todolist` 写的极简测试套件（15 用例），覆盖：
- `db.ts` 数据层：增删改查、按 user_id 隔离、排序、孤儿数据接管
- `types/todo.ts` 的 `isValidDueDate` 日期校验

## 跑测试

```bash
cd ch06_test
npm install          # 第一次需要装依赖
npm test             # 跑一次
npm run test:watch   # watch 模式
```

## 设计要点

- 用 **Vitest**：跟前端 Vite 同体系，ESM 友好，零配置
- 数据库走 `:memory:`：通过 `process.env.DB_PATH=':memory:'` + `vi.resetModules()` 让每个测试拿到一个干净的内存库，互不污染、不动真实 `data/todos.db`
- 直接 import 源码 ts 文件（不依赖编译产物），改了源码立刻能测

## 覆盖度

| 文件 | 用例数 | 测了啥 |
|---|---|---|
| `tests/db.test.ts` | 10 | createTodo 默认值、getTodo 越权、listTodos 隔离/排序/已完成沉底、updateTodo 越权防护 + priority_sort 同步、deleteTodo 越权防护、claimOrphanTodos |
| `tests/dueDate.test.ts` | 5 | 合法日期 / 缺前导 0 / 2 月 30 / 非字符串 / 无意义字符串 |
