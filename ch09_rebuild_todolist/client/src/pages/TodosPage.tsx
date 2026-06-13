import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Todo } from '../types';
import * as api from '../api';
import type { Filters } from '../api';
import { useAuth } from '../auth/AuthContext';
import { TodoForm, type TodoFormValues } from '../components/TodoForm';
import { TodoList } from '../components/TodoList';
import {
  FilterHeader,
  FilterPanel,
  countActiveFilters,
} from '../components/FilterBar';

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
  const [showAdd, setShowAdd] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
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

  const activeFilterCount = countActiveFilters(filters);

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
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
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

        <FilterHeader
          filters={filters}
          categories={categories}
          onChange={setFilters}
        />

        <div className="flex items-center justify-between mt-3 mb-3">
          <button
            type="button"
            className={
              'text-sm px-3 py-1 rounded border transition-colors ' +
              (showAdd
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100')
            }
            onClick={() => setShowAdd((v) => !v)}
          >
            {showAdd ? '× 收起' : '+ 添加待办'}
          </button>
          <button
            type="button"
            className={
              'text-sm px-3 py-1 rounded border transition-colors ' +
              (showFilter || activeFilterCount > 0
                ? 'bg-gray-100 text-gray-800 border-gray-300'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100')
            }
            onClick={() => setShowFilter((v) => !v)}
          >
            ⚙ 筛选
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center bg-blue-600 text-white text-xs rounded-full px-1.5 min-w-[1.25rem]">
                {activeFilterCount}
              </span>
            )}
            <span className="ml-1">{showFilter ? '▴' : '▾'}</span>
          </button>
        </div>

        {showAdd && (
          <div className="p-3 mb-3 bg-blue-50 border border-blue-100 rounded">
            <TodoForm submitText="添加" onSubmit={handleAdd} />
          </div>
        )}

        {showFilter && (
          <div className="mb-3">
            <FilterPanel
              filters={filters}
              categories={categories}
              onChange={setFilters}
            />
          </div>
        )}

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
