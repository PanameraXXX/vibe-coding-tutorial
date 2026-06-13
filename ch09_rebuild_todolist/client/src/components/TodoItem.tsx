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
      <li className="py-2 border-b last:border-b-0">
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
  const showMeta = todo.category || todo.dueDate;

  return (
    <li className="py-2 border-b last:border-b-0">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={todo.done}
          onChange={(e) => onToggle(todo.id, e.target.checked)}
        />
        <span
          className={`flex-1 ${todo.done ? 'line-through text-gray-400' : ''}`}
        >
          {todo.title}
        </span>
        {todo.priority && (
          <span title={`优先级 ${todo.priority}`}>
            {PRIORITY_EMOJI[todo.priority]}
          </span>
        )}
        <button
          className="text-sm text-gray-500 hover:text-gray-800"
          onClick={() => setEditing(true)}
        >
          编辑
        </button>
        <button
          className="text-sm text-red-500 hover:text-red-700"
          onClick={() => onDelete(todo.id)}
        >
          删除
        </button>
      </div>
      {showMeta && (
        <div className="flex items-center gap-2 pl-6 mt-1 text-xs">
          {todo.category && (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {todo.category}
            </span>
          )}
          {todo.dueDate && (
            <span className={overdue ? 'text-red-500' : 'text-gray-500'}>
              ⏰ {todo.dueDate}
            </span>
          )}
        </div>
      )}
    </li>
  );
}
