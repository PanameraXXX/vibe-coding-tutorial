# 阶段 3 设计：分类 + 优先级 + 截止日期

**目标**：给 todo 增加三个可选字段——分类（自由文本）、优先级（1/2/3）、截止日期（ISO YYYY-MM-DD），并按"优先级高→低、同优先级按截止日期升序"在服务端排序展示。

**范围**：本阶段只做字段增加 + 默认排序 + 列表展示 + 编辑 UI。**不**做过滤、搜索、排序切换（那是阶段 4）。

---

## 数据模型

`todos` 表新增三列，全部允许 NULL：

| 列名 | 类型 | 约束 | 含义 |
|---|---|---|---|
| `category` | TEXT | 可空 | 分类，自由文本 |
| `priority` | INTEGER | 可空，仅 1/2/3 由服务层校验 | 1=低 2=中 3=高 |
| `due_date` | TEXT | 可空，ISO `YYYY-MM-DD` 由服务层校验 | 截止日期 |

**迁移策略**：沿用阶段 2 的 `PRAGMA table_info` 模式，启动时检测列是否存在，缺哪列就 `ALTER TABLE todos ADD COLUMN ...`。已有数据**保留**（三列都允许 NULL，老数据自动填 NULL）。

**校验**（在 service 层，路由层抛 400）：
- `priority`：若提供，必须是 1 / 2 / 3 之一
- `dueDate`：若提供，必须匹配 `^\d{4}-\d{2}-\d{2}$`
- `category`：不限长度

---

## API 改动

### POST /api/todos

请求 body：

```ts
{
  title: string;           // 必填
  category?: string;       // 可选
  priority?: 1 | 2 | 3;    // 可选
  dueDate?: string;        // 可选，YYYY-MM-DD
}
```

返回完整 Todo（含三个新字段，未填的为 null）。

### PATCH /api/todos/:id

请求 body：

```ts
{
  title?: string;
  done?: boolean;
  category?: string | null;
  priority?: 1 | 2 | 3 | null;
  dueDate?: string | null;
}
```

**字段语义**：
- 不传字段 → 不修改
- 传 `null` → 清空该字段
- 传具体值 → 更新为该值

例：`{ category: null }` 把分类抹掉；`{}` 啥也不改。

### GET /api/todos

排序规则改为：

```sql
ORDER BY priority DESC NULLS LAST, due_date ASC NULLS LAST, id ASC
```

效果：优先级高的在前，同优先级按截止日期升序，没填优先级/日期的沉底，最后按 id 兜底稳定。

### Todo 类型（前后端统一）

```ts
type Todo = {
  id: number;
  title: string;
  done: boolean;
  category: string | null;
  priority: 1 | 2 | 3 | null;
  dueDate: string | null;  // ISO YYYY-MM-DD
};
```

DB 列名 `due_date` 在 service 层映射成 API/前端的 `dueDate`。

---

## 前端组件

### TodoForm（替代现有的 TodoInput）

复用同一个组件做"新增"和"编辑"两种模式：

```ts
type TodoFormProps = {
  initial?: Partial<Todo>;
  onSubmit(values: { title; category; priority; dueDate }): void;
  onCancel?(): void;
  submitText: string;
};
```

布局：
- 第一行：title 输入框（占满）
- 第二行：category 输入框 + priority `<select>`（无/低/中/高）+ `<input type="date">`
- 第三行：提交按钮 + （可选）取消按钮

**新增模式**：`<TodoForm onSubmit={handleAdd} submitText="添加" />`，提交后清空表单字段。

**编辑模式**：`<TodoForm initial={todo} onSubmit={...} onCancel={...} submitText="保存" />`，作为 TodoItem 的整行替换渲染。

### TodoItem

新增内部 `editing` 状态：

- **非 editing 视图**（两行结构）：
  - 主行：复选框 + 标题 + 优先级 emoji + 操作区（"编辑" / "删除"按钮）
  - 副行（仅当 category/dueDate 任一非空时渲染）：分类药丸 + 截止日期
- **editing 视图**：整行用 `TodoForm` 替换

**视觉规则**：
- 优先级：1=🟢 / 2=🟡 / 3=🔴（emoji，不引入图标库）
- 分类：灰底圆角小药丸 `[生活]`
- 截止日期：前缀 ⏰，**已过期且 done=false** 时整体红色

### TodosPage

- 不在前端做排序（服务端已排好）
- **编辑成功后自动 refetch 整个列表**，确保排序与新值一致；新增/删除/勾选完成同样 refetch（统一策略，避免特例）
- 加字段不影响 useAuth / RequireAuth / 路由

---

## 测试范围

**后端**（从 31 → 约 43）：

| 文件 | 新增 | 关键用例 |
|---|---|---|
| `services.todos.test.ts` | +5 | 创建带三个新字段；PATCH 用 null 清空字段；PATCH 不传字段不动；list 排序：priority DESC NULLS LAST + dueDate ASC NULLS LAST |
| `routes.todos.test.ts` | +4 | POST 含新字段；PATCH 含新字段；priority 非 1/2/3 → 400；dueDate 非 ISO → 400 |
| `db.schema.test.ts`（新） | 3 | 新建库三列存在；老库（无三列）触发 ALTER TABLE 后三列存在；老库已有 todos 数据迁移后保留 |

**前端**：本阶段不加自动化测试，靠 `tsc + vite build` + 手动浏览器验证。

---

## 不在本阶段做（明确划清）

- 过滤 / 搜索 / 多排序切换 → 阶段 4
- 拖拽排序 → 阶段 5
- 多 tags（与 category 不同概念）→ 阶段 6
- 暗色模式 → 阶段 7
- 前端组件单元测试

---

## 风险与决策记录

1. **NULLS LAST 兼容性**：better-sqlite3 内置的 SQLite 版本 ≥ 3.30，`NULLS LAST` 原生支持。如果未来切到老版本 SQLite，需要回退到 `ORDER BY priority IS NULL, priority DESC, ...` 的写法。
2. **前端 refetch 策略**：编辑后自动 refetch 是为了让排序立刻一致。代价是每次操作多一次 GET；列表小（教学场景），可以接受。
3. **priority 用数字而非字符串**：1/2/3 排序天然正确；如果用 'low'/'mid'/'high' 文本，要在 SQL 里 CASE，或前端排序，都不如数字简单。
