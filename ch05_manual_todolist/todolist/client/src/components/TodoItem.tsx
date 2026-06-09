// 单个待办项：优先级左边条 + 分类圆点 + 勾选框 + 标题 + 删除
import type { Todo } from '../types/todo';
import { CATEGORY_MAP, PRIORITY_MAP } from '../types/todo';

interface Props {
  todo: Todo;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
}

export default function TodoItem({ todo, onToggle, onDelete }: Props) {
  const cat = CATEGORY_MAP[todo.category];
  const pri = PRIORITY_MAP[todo.priority];

  return (
    <li className={`flex items-center gap-3 py-3 px-3 -mx-3 group border-l-4 ${pri.borderClass}`}>
      <span className={`w-3 h-3 rounded-full shrink-0 ${cat.color}`} />
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={(e) => onToggle(todo.id, e.target.checked)}
        className="w-5 h-5 rounded text-blue-500 focus:ring-blue-400 cursor-pointer"
      />
      <span
        className={`flex-1 ${
          todo.completed ? 'line-through text-gray-400' : 'text-gray-800'
        }`}
      >
        {todo.title}
      </span>
      <span className="text-xs text-gray-400 hidden sm:inline">{cat.label}</span>
      <span className={`w-2 h-2 rounded-full hidden sm:inline-block ${pri.dotColor}`} />
      <button
        onClick={() => onDelete(todo.id)}
        className="text-sm text-red-500 opacity-0 group-hover:opacity-100 hover:text-red-700 transition"
      >
        删除
      </button>
    </li>
  );
}