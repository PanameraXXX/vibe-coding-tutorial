import { useState, type FormEvent } from 'react';
import type { Todo } from '../types';

export interface TodoFormValues {
  title: string;
  category: string | null;
  priority: 1 | 2 | 3 | null;
  dueDate: string | null;
}

interface Props {
  initial?: Partial<Todo>;
  submitText: string;
  onSubmit: (values: TodoFormValues) => void;
  onCancel?: () => void;
}

// 同时支持新增和编辑两种模式
export function TodoForm({ initial, submitText, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [priority, setPriority] = useState<'' | '1' | '2' | '3'>(
    initial?.priority ? (String(initial.priority) as '1' | '2' | '3') : ''
  );
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onSubmit({
      title: t,
      category: category.trim() ? category.trim() : null,
      priority: priority === '' ? null : (Number(priority) as 1 | 2 | 3),
      dueDate: dueDate ? dueDate : null,
    });
    if (!initial) {
      // 新增模式提交后清空
      setTitle('');
      setCategory('');
      setPriority('');
      setDueDate('');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        className="border rounded px-3 py-2"
        placeholder="想做点什么..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[8rem] border rounded px-2 py-1 text-sm"
          placeholder="分类（可选）"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <select
          className="border rounded px-2 py-1 text-sm bg-white"
          value={priority}
          onChange={(e) => setPriority(e.target.value as '' | '1' | '2' | '3')}
        >
          <option value="">优先级</option>
          <option value="1">🟢 低</option>
          <option value="2">🟡 中</option>
          <option value="3">🔴 高</option>
        </select>
        <input
          type="date"
          className="border rounded px-2 py-1 text-sm"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white text-sm px-4 py-1 rounded hover:bg-blue-700"
        >
          {submitText}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm px-3 py-1 rounded border hover:bg-gray-100"
          >
            取消
          </button>
        )}
      </div>
    </form>
  );
}
