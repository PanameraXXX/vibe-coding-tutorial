import { useState } from 'react';
import type { Todo } from '../types';
import { TodoForm, type TodoFormValues } from './TodoForm';

interface Props {
  todo: Todo;
  onToggle: (id: number, done: boolean) => void;
  onUpdate: (id: number, patch: TodoFormValues) => void;
  onDelete: (id: number) => void;
}

const PRIORITY_EMOJI: Record<1 | 2 | 3, string> = {
  1: '🟢',
  2: '🟡',
  3: '🔴',
};

function isOverdue(dueDate: string | null, done: boolean): boolean {
  if (!dueDate || done) return false;
  // YYYY-MM-DD 字典序与日期序一致
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  return dueDate < todayStr;
}

export function TodoItem({ todo, onToggle, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="py-2 px-2 border-b last:border-b-0 bg-blue-50">
        <TodoForm
          initial={todo}
          submitText="保存"
          onSubmit={(values) => {
            onUpdate(todo.id, values);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  const overdue = isOverdue(todo.dueDate, todo.done);

  return (
    <li className="group flex items-center gap-2 px-2 py-2 border-b last:border-b-0 hover:bg-gray-50">
      <input
        type="checkbox"
        checked={todo.done}
        onChange={(e) => onToggle(todo.id, e.target.checked)}
      />
      {todo.priority && (
        <span className="text-sm" title={`优先级 ${todo.priority}`}>
          {PRIORITY_EMOJI[todo.priority]}
        </span>
      )}
      <span
        className={`flex-1 truncate ${todo.done ? 'line-through text-gray-400' : ''}`}
      >
        {todo.title}
      </span>
      {todo.category && (
        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
          {todo.category}
        </span>
      )}
      {todo.dueDate && (
        <span
          className={`text-xs whitespace-nowrap ${overdue ? 'text-red-500' : 'text-gray-500'}`}
        >
          ⏰ {todo.dueDate}
        </span>
      )}
      <button
        className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
        title="编辑"
        onClick={() => setEditing(true)}
      >
        ✏️
      </button>
      <button
        className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        title="删除"
        onClick={() => onDelete(todo.id)}
      >
        🗑️
      </button>
    </li>
  );
}
