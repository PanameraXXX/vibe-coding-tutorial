# 阶段 4 设计：过滤 + 搜索

> 上游：[ch08 总设计](2026-06-13-ch08-rebuild-todolist-design.md) · [阶段 3 设计](2026-06-13-stage3-fields-design.md)

## 目标

在阶段 3 的字段（分类 / 优先级 / 截止日期）基础上，给 TODO 列表增加**过滤**与**标题搜索**能力，用一根顶部过滤栏把它们组合起来。

## 范围

**做：**
- 后端 `GET /api/todos` 支持五个可选 query：`done` / `category` / `priority` / `due` / `q`
- 多条件 **AND** 组合
- 标题搜索：不区分大小写、子串匹配（`LIKE`），对 `%` `_` 做转义
- 截止日期过滤：四个**预设桶** —— `today` / `week` / `overdue` / `none`
- 前端新增受控 `FilterBar` 组件，状态放在 `TodosPage`
- 写操作（增删改）后用当前 `filters` 重新拉列表
- 后端单元测试 + 路由测试覆盖每个过滤维度与组合

**不做：**
- 前端单元测试（沿用 ch08 风格，前端靠浏览器 smoke）
- URL querystring 同步（刷新会丢失过滤态，教学场景可接受）
- 全文搜索（仅 `title`，不搜 `category`/备注）
- 自定义日期范围、防抖、分页

## 数据流

```
FilterBar (受控)
  filters: { done, category, priority, due, q }
        │  onChange
        ▼
TodosPage  filters state
        │  useEffect([filters])
        ▼
api.fetchTodos(filters)  ──►  GET /api/todos?done=&category=&priority=&due=&q=
        │                              │
        │                              ▼
        │                        服务端过滤 + 排序（沿用阶段 3）
        ▼                              │
TodoList ◄─────────────────────────────┘
```

要点：
- 单一数据源：`filters` 只在 `TodosPage`
- 输入即过滤（搜索无防抖）—— 每次 keystroke 触发一次 GET
- 写操作（增删改）后仍然 `refetch(filters)`，保持过滤态
- AND 组合：query 参数缺省 / 空 = 不限制该维度

## API 设计

**端点：** `GET /api/todos`（沿用，新增 5 个可选 query 参数）

| 参数 | 取值 | 语义 | 校验 |
|---|---|---|---|
| `done` | `active` / `done` | 是否完成；缺省 = 全部 | 仅这两个值，否则 400 |
| `category` | 任意非空字符串 | 精确匹配 `category`；缺省 = 不限 | trim 后非空才生效 |
| `priority` | `1` / `2` / `3` | 精确匹配；缺省 = 不限 | 必须是 1/2/3，否则 400 |
| `due` | `today` / `week` / `overdue` / `none` | 预设桶；缺省 = 不限 | 枚举外 400 |
| `q` | 任意字符串 | 标题模糊匹配（不区分大小写）；空串 = 不限 | 不校验 |

`due` 语义（按服务器本地日期算）：

- `today`：`due_date = ${今天 YYYY-MM-DD}`
- `week`：`due_date BETWEEN 今天 AND 今天+6 天`（含两端，共 7 天）
- `overdue`：`due_date < 今天 AND done = 0`（已完成的不算逾期）
- `none`：`due_date IS NULL`

`q` 实现：`LOWER(title) LIKE LOWER(?) ESCAPE '\'`，参数为 `%${escaped}%`，对 `\` `%` `_` 做转义。

**组合：** 所有非空条件用 `AND` 拼到 WHERE。

**响应：** `Todo[]`，排序沿用阶段 3：

```sql
ORDER BY priority DESC NULLS LAST, due_date ASC NULLS LAST, id ASC
```

**校验失败：** `400 { error: "invalid <param>" }`，不查数据库。

## 后端实现

`server/src/services/todos.ts`：

```ts
export interface ListFilters {
  done?: 'active' | 'done';
  category?: string;
  priority?: 1 | 2 | 3;
  due?: 'today' | 'week' | 'overdue' | 'none';
  q?: string;
}

export function listTodos(userId: number, filters: ListFilters = {}): Todo[] {
  const where: string[] = ['user_id = ?'];
  const params: (string | number)[] = [userId];

  if (filters.done === 'active') where.push('done = 0');
  if (filters.done === 'done')   where.push('done = 1');

  if (filters.category) { where.push('category = ?'); params.push(filters.category); }
  if (filters.priority) { where.push('priority = ?'); params.push(filters.priority); }

  if (filters.due === 'today')   { where.push('due_date = ?');   params.push(today()); }
  if (filters.due === 'week')    { where.push('due_date BETWEEN ? AND ?'); params.push(today(), addDays(today(), 6)); }
  if (filters.due === 'overdue') { where.push('due_date < ? AND done = 0'); params.push(today()); }
  if (filters.due === 'none')    { where.push('due_date IS NULL'); }

  if (filters.q) {
    const escaped = filters.q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
    where.push(`LOWER(title) LIKE LOWER(?) ESCAPE '\\'`);
    params.push(`%${escaped}%`);
  }

  const sql = `SELECT ${SELECT_COLUMNS} FROM todos WHERE ${where.join(' AND ')} ORDER BY priority DESC NULLS LAST, due_date ASC NULLS LAST, id ASC`;
  return db.prepare(sql).all(...params).map(rowToTodo);
}
```

`today()` 用 `new Date()` 取服务器本地日期，格式化成 `YYYY-MM-DD`（和阶段 3 客户端 `isOverdue` 相同思路）。

`server/src/routes/todos.ts` 中 `GET /api/todos` 解析 + 校验 query → 调 `listTodos(userId, filters)`。

## 前端实现

**新增 `client/src/components/FilterBar.tsx`**（受控）：

```ts
export interface Filters {
  done: 'all' | 'active' | 'done';
  category: string;        // '' = 不限
  priority: '' | '1' | '2' | '3';
  due: '' | 'today' | 'week' | 'overdue' | 'none';
  q: string;
}

interface Props {
  filters: Filters;
  categories: string[];    // 当前 todos 派生
  onChange: (next: Filters) => void;
}
```

布局两行：

```
[全部] [未完] [已完]                              ← done tabs
[分类 ▾]  [优先级 ▾]  [日期 ▾]  [🔍 搜索标题...]   ← 其余 4 项
```

- **done tabs**：3 个 button，激活态加底色
- **分类下拉**：`['全部', ...categories]`；categories 从已加载 todos 去重派生
- **优先级下拉**：`全部 / 🟢 低 / 🟡 中 / 🔴 高`
- **日期下拉**：`全部 / 今天 / 本周 / 已过期 / 无日期`
- **搜索框**：`<input>`，输入即 `onChange`

**`client/src/api.ts`**：`fetchTodos(filters?: Filters)` 把非空字段拼到 query string；`done='all'` / `category=''` / `priority=''` / `due=''` / `q=''` 跳过。

**`client/src/pages/TodosPage.tsx`**：
- 新增 `const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)`
- `useEffect(() => { refetch(); }, [filters])`
- `refetch()` 改为读 `filters` 调 `fetchTodos(filters)`
- `categories = useMemo(() => uniq(todos.map(t => t.category).filter(Boolean)), [todos])`
  - 选项来自当前已过滤列表（教学简化），过滤后看不到的分类需要先放宽其它维度

**空结果文案：** 沿用阶段 3 的 `"还没有待办"`，过滤后无匹配同样这一句（用户选择"一套文案"）。

## 测试范围

**`server/tests/services.todos.test.ts` 新增：**

- `listTodos(userId, { done: 'active' })` 只返回未完成
- `listTodos(userId, { done: 'done' })` 只返回已完成
- `listTodos(userId, { category: '工作' })` 精确匹配
- `listTodos(userId, { priority: 3 })` 精确匹配
- `listTodos(userId, { due: 'today' })` 命中今天
- `listTodos(userId, { due: 'week' })` 命中今天起 7 天内（含今天与第 7 天）
- `listTodos(userId, { due: 'overdue' })` 不含已完成的过期项
- `listTodos(userId, { due: 'none' })` 命中 dueDate 为 null
- `listTodos(userId, { q: 'shu' })` 不区分大小写匹配 title
- `listTodos(userId, { q: '50%' })` `%` 转义后能匹配字面量
- 多条件 AND 组合（done + priority + q 同时生效）
- 用户隔离不破坏（A 的过滤不会命中 B 的）

**`server/tests/routes.todos.test.ts` 新增：**

- `GET /api/todos?done=active` 200，结果不含已完成
- `GET /api/todos?priority=invalid` 400
- `GET /api/todos?due=tomorrow` 400
- `GET /api/todos?done=maybe` 400
- `GET /api/todos?done=active&priority=3&q=...` 200，AND 生效

**前端：** 不加单测。浏览器 smoke 用例：
- 切换 done tabs 列表变化
- 选分类后只剩同分类
- "今天 / 本周 / 已过期 / 无日期" 各点一遍
- 搜索框输入实时过滤
- 多维度叠加生效
- 清空所有过滤回到全量
