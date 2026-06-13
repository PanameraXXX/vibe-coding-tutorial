import type { Filters } from '../api';

interface Props {
  filters: Filters;
  categories: string[];
  onChange: (next: Filters) => void;
}

const DONE_TABS: { value: Filters['done']; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '未完' },
  { value: 'done', label: '已完' },
];

const PRIORITY_OPTIONS: { value: Filters['priority']; label: string }[] = [
  { value: '', label: '优先级（全部）' },
  { value: '3', label: '🔴 高' },
  { value: '2', label: '🟡 中' },
  { value: '1', label: '🟢 低' },
];

const DUE_OPTIONS: { value: Filters['due']; label: string }[] = [
  { value: '', label: '日期（全部）' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'overdue', label: '已过期' },
  { value: 'none', label: '无日期' },
];

// 已激活的"高级"过滤条目数（分类/优先级/日期），用于操作行徽标
export function countActiveFilters(filters: Filters): number {
  let n = 0;
  if (filters.category) n++;
  if (filters.priority) n++;
  if (filters.due) n++;
  return n;
}

// done tabs + 搜索框，常驻
export function FilterHeader({ filters, onChange }: Props) {
  function patch(p: Partial<Filters>) {
    onChange({ ...filters, ...p });
  }
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {DONE_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => patch({ done: t.value })}
            className={
              'px-3 py-1 rounded text-sm border transition-colors ' +
              (filters.done === t.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100')
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        className="flex-1 border rounded px-3 py-1 text-sm"
        placeholder="🔍 搜索标题"
        value={filters.q}
        onChange={(e) => patch({ q: e.target.value })}
      />
    </div>
  );
}

// 分类 / 优先级 / 日期，折叠面板
export function FilterPanel({ filters, categories, onChange }: Props) {
  function patch(p: Partial<Filters>) {
    onChange({ ...filters, ...p });
  }
  return (
    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded">
      <select
        className="border rounded px-2 py-1 text-sm bg-white"
        value={filters.category}
        onChange={(e) => patch({ category: e.target.value })}
      >
        <option value="">分类（全部）</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        className="border rounded px-2 py-1 text-sm bg-white"
        value={filters.priority}
        onChange={(e) =>
          patch({ priority: e.target.value as Filters['priority'] })
        }
      >
        {PRIORITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        className="border rounded px-2 py-1 text-sm bg-white"
        value={filters.due}
        onChange={(e) => patch({ due: e.target.value as Filters['due'] })}
      >
        {DUE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {countActiveFilters(filters) > 0 && (
        <button
          type="button"
          className="ml-auto text-sm text-gray-500 hover:text-gray-700"
          onClick={() =>
            onChange({ ...filters, category: '', priority: '', due: '' })
          }
        >
          清除筛选
        </button>
      )}
    </div>
  );
}
