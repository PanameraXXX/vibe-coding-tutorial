import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Todo } from '../types';
import * as api from '../api';
import type { Filters } from '../api';
import { useAuth } from '../auth/AuthContext';
import { TodoForm, type TodoFormValues } from '../components/TodoForm';
import { TodoList } from '../components/TodoList';
import { FilterBar } from '../components/FilterBar';

const DEFAULT_FILTERS: Filters = {
  done: 'all',
  category: '',
  priority: '',
  due: '',
  q: '',
};

export default function TodosPage() {
  const { user, logout } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // 写操作完成后刷新整个列表，保证排序与最新值一致
  async function refetch() {
    try {
      const list = await api.fetchTodos(filters);
      setTodos(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // 分类下拉选项：从当前列表去重派生
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of todos) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set);
  }, [todos]);

  async function handleAdd(values: TodoFormValues) {
    try {
      await api.createTodo(values);
      await refetch();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleToggle(id: number, done: boolean) {
    try {
      await api.updateTodo(id, { done });
      await refetch();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUpdate(id: number, patch: TodoFormValues) {
    try {
      await api.updateTodo(id, patch);
      await refetch();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteTodo(id);
      await refetch();
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
        <TodoForm submitText="添加" onSubmit={handleAdd} />
        <FilterBar
          filters={filters}
          categories={categories}
          onChange={setFilters}
        />
        <TodoList
          todos={todos}
          onToggle={handleToggle}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
