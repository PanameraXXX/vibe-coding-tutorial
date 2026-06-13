# ch08 · 用 AI 重建 TODO List

从空目录出发，跟着 Claude Code 一起把 ch05 的 TODO List 重建一遍，外加四个新亮点。教学主线是 **AI 协作流程**：每个阶段都跑一次完整的 brainstorm → spec → plan → TDD → 实现 → 验证 → commit 循环。

## 设计文档

- 总设计：[`docs/superpowers/specs/2026-06-13-ch08-rebuild-todolist-design.md`](docs/superpowers/specs/2026-06-13-ch08-rebuild-todolist-design.md)

## 阶段进度

| # | 阶段 | 状态 | Spec | Plan |
|---|---|---|---|---|
| 1 | MVP（CRUD + 持久化） | ✅ 完成 | [link](docs/superpowers/specs/2026-06-13-stage1-mvp-design.md) | [link](docs/superpowers/plans/2026-06-13-stage1-mvp-plan.md) |
| 2 | 登录 + 用户隔离 | ✅ 完成 | [link](docs/superpowers/specs/2026-06-13-stage2-auth-design.md) | [link](docs/superpowers/plans/2026-06-13-stage2-auth-plan.md) |
| 3 | 分类 + 优先级 + 截止日期 | ✅ 完成 | [link](docs/superpowers/specs/2026-06-13-stage3-fields-design.md) | [link](docs/superpowers/plans/2026-06-13-stage3-fields-plan.md) |
| 4 | 过滤 + 搜索 | ✅ 完成 | [link](docs/superpowers/specs/2026-06-13-stage4-filter-search-design.md) | [link](docs/superpowers/plans/2026-06-13-stage4-filter-search-plan.md) |
| 5 | 拖拽排序 | ⏳ 待开始 | — | — |
| 6 | 多标签 tags | ⏳ 待开始 | — | — |
| 7 | 深色模式 | ⏳ 待开始 | — | — |

## 启动

两个终端：

```bash
cd server && npm install && npm run dev   # http://localhost:3001
```

```bash
cd client && npm install && npm run dev   # http://localhost:5173
```

## 测试

```bash
cd server && npm test
```
