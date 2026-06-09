// 应用入口：拉取数据 + 分类过滤 + 串联所有操作
import { useEffect, useState } from 'react';
import TodoInput from './components/TodoInput';
import TodoList from './components/TodoList';
import * as api from './api/todoApi';
import type { Todo, Category, Priority } from './types/todo';
import { CATEGORIES } from './types/todo';

type Filter = 'all' | Category;

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  // 首次加载
  useEffect(() => {
    api
      .listTodos()
      .then(setTodos)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  async function refresh() {
    const latest = await api.listTodos();
    setTodos(latest);
  }

  async function handleAdd(title: string, category: Category, priority: Priority) {
    try {
      await api.createTodo({ title, category, priority });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加失败');
    }
  }

  async function handleToggle(id: number, completed: boolean) {
    try {
      await api.updateTodo(id, { completed });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新失败');
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  }

  const filteredTodos =
    filter === 'all' ? todos : todos.filter((t) => t.category === filter);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          📝 TODO List
        </h1>

        <TodoInput onAdd={handleAdd} />

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 text-red-600 text-sm rounded border border-red-200">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* 分类过滤栏 */}
        <div className="flex gap-1 mb-4 border-b border-gray-200 pb-2">
          {[
            { value: 'all' as const, label: '全部' },
            ...CATEGORIES.map((c) => ({ value: c.value as Filter, label: c.label })),
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1 text-sm rounded-t transition ${
                filter === tab.value
                  ? 'text-blue-600 border-b-2 border-blue-500 font-medium'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-12">加载中...</p>
        ) : (
          <TodoList
            todos={filteredTodos}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}