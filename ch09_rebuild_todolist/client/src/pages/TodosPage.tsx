import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Todo } from '../types';
import * as api from '../api';
import { useAuth } from '../auth/AuthContext';
import { TodoInput } from '../components/TodoInput';
import { TodoList } from '../components/TodoList';

export default function TodosPage() {
  const { user, logout } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.fetchTodos().then(setTodos).catch((e) => setError(String(e)));
  }, []);

  async function handleAdd(title: string) {
    try {
      const t = await api.createTodo(title);
      setTodos((prev) => [...prev, t]);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleToggle(id: number, done: boolean) {
    try {
      const t = await api.updateTodo(id, { done });
      setTodos((prev) => prev.map((x) => (x.id === id ? t : x)));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleEdit(id: number, title: string) {
    try {
      const t = await api.updateTodo(id, { title });
      setTodos((prev) => prev.map((x) => (x.id === id ? t : x)));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteTodo(id);
      setTodos((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-xl mx-auto bg-white rounded shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">TODO List</h1>
          <div className="text-sm">
            <span className="text-gray-500 mr-2">你好，{user?.username}</span>
            <button
              className="text-red-500 hover:text-red-700"
              onClick={handleLogout}
            >
              退出
            </button>
          </div>
        </div>
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
