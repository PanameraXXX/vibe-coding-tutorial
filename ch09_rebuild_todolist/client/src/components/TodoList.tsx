import type { Todo } from '../types';
import { TodoItem } from './TodoItem';

interface Props {
  todos: Todo[];
  onToggle: (id: number, done: boolean) => void;
  onEdit: (id: number, title: string) => void;
  onDelete: (id: number) => void;
}

export function TodoList({ todos, onToggle, onEdit, onDelete }: Props) {
  if (todos.length === 0) {
    return <p className="text-gray-400 text-center py-8">还没有待办</p>;
  }
  return (
    <ul>
      {todos.map((t) => (
        <TodoItem
          key={t.id}
          todo={t}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
