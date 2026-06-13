import type { Todo } from '../types';
import { TodoItem } from './TodoItem';
import type { TodoFormValues } from './TodoForm';

interface Props {
  todos: Todo[];
  onToggle: (id: number, done: boolean) => void;
  onUpdate: (id: number, patch: TodoFormValues) => void;
  onDelete: (id: number) => void;
}

export function TodoList({ todos, onToggle, onUpdate, onDelete }: Props) {
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
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
