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

export function FilterBar({ filters, categories, onChange }: Props) {
  function patch(p: Partial<Filters>) {
    onChange({ ...filters, ...p });
  }

  return (
    <div className="flex flex-col gap-2 mb-3">
      <div className="flex gap-1">
        {DONE_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => patch({ done: t.value })}
            className={
              'px-3 py-1 rounded text-sm border ' +
              (filters.done === t.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 hover:bg-gray-100')
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          className="border rounded px-2 py-1 text-sm"
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
          className="border rounded px-2 py-1 text-sm"
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
          className="border rounded px-2 py-1 text-sm"
          value={filters.due}
          onChange={(e) => patch({ due: e.target.value as Filters['due'] })}
        >
          {DUE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="flex-1 min-w-[8rem] border rounded px-2 py-1 text-sm"
          placeholder="🔍 搜索标题"
          value={filters.q}
          onChange={(e) => patch({ q: e.target.value })}
        />
      </div>
    </div>
  );
}
