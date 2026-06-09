// 添加待办：输入框 + 分类选择 + 优先级选择
import { useState, type FormEvent } from 'react';
import type { Category, Priority } from '../types/todo';
import { CATEGORIES, PRIORITIES } from '../types/todo';

interface Props {
  onAdd: (title: string, category: Category, priority: Priority, dueDate: string | null) => Promise<void> | void;
}

export default function TodoInput({ onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      await onAdd(trimmed, category, priority, dueDate || null);
      setTitle('');
      setDueDate('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="写点什么要做的..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          添加
        </button>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {/* 分类 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 mr-0.5">分类</span>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition ${
                category === c.value
                  ? 'ring-2 ring-offset-1 border-gray-400'
                  : 'border-transparent opacity-50 hover:opacity-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${c.color}`} />
              {c.label}
            </button>
          ))}
        </div>

        {/* 优先级 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 mr-0.5">优先级</span>
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`px-2.5 py-1 text-xs rounded border transition ${
                priority === p.value
                  ? 'ring-2 ring-offset-1 border-gray-400 font-medium'
                  : 'border-transparent opacity-50 hover:opacity-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 截止日期 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 mr-0.5">截止</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="px-2 py-0.5 text-xs border border-gray-300 rounded text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {dueDate && (
            <button
              type="button"
              onClick={() => setDueDate('')}
              className="text-xs text-gray-400 hover:text-gray-600"
              title="清除截止日期"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </form>
  );
}