// 待办列表
import type { Todo } from '../types/todo';
import TodoItem from './TodoItem';

interface Props {
  todos: Todo[];
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
}

export default function TodoList({ todos, onToggle, onDelete }: Props) {
  if (todos.length === 0) {
    return (
      <p className="text-gray-400 text-center py-12">还没有待办，加一条吧～</p>
    );
  }
  return (
    <ul className="divide-y divide-gray-200">
      {todos.map((t) => (
        <TodoItem
          key={t.id}
          todo={t}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
