import { useState } from 'react';
import type { Todo } from '../types';

interface Props {
  todo: Todo;
  onToggle: (id: number, done: boolean) => void;
  onEdit: (id: number, title: string) => void;
  onDelete: (id: number) => void;
}

export function TodoItem({ todo, onToggle, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);

  function save() {
    const t = draft.trim();
    if (!t) return;
    onEdit(todo.id, t);
    setEditing(false);
  }

  return (
    <li className="flex items-center gap-2 py-2 border-b last:border-b-0">
      <input
        type="checkbox"
        checked={todo.done}
        onChange={(e) => onToggle(todo.id, e.target.checked)}
      />
      {editing ? (
        <input
          autoFocus
          className="flex-1 border rounded px-2 py-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') {
              setDraft(todo.title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <span
          className={`flex-1 ${todo.done ? 'line-through text-gray-400' : ''}`}
          onDoubleClick={() => {
            setDraft(todo.title);
            setEditing(true);
          }}
        >
          {todo.title}
        </span>
      )}
      <button
        className="text-sm text-gray-500 hover:text-gray-800"
        onClick={() => {
          setDraft(todo.title);
          setEditing(true);
        }}
      >
        编辑
      </button>
      <button
        className="text-sm text-red-500 hover:text-red-700"
        onClick={() => onDelete(todo.id)}
      >
        删除
      </button>
    </li>
  );
}
