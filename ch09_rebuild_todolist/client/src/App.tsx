import { useEffect, useState } from 'react';
import type { Todo } from './types';
import * as api from './api';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.fetchTodos().then(setTodos).catch((e) => setError(String(e)));
  }, []);

  async function handleAdd(title: string) {
    const t = await api.createTodo(title);
    setTodos((prev) => [...prev, t]);
  }

  async function handleToggle(id: number, done: boolean) {
    const t = await api.updateTodo(id, { done });
    setTodos((prev) => prev.map((x) => (x.id === id ? t : x)));
  }

  async function handleEdit(id: number, title: string) {
    const t = await api.updateTodo(id, { title });
    setTodos((prev) => prev.map((x) => (x.id === id ? t : x)));
  }

  async function handleDelete(id: number) {
    await api.deleteTodo(id);
    setTodos((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-xl mx-auto bg-white rounded shadow p-6">
        <h1 className="text-2xl font-bold mb-4">TODO List</h1>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <TodoInput onAdd={handleAdd} />
        <TodoList
          todos={todos}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
