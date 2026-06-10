// 应用入口：登录态切换 + 拉取数据 + 分类过滤 + 串联所有操作
import { useEffect, useState } from 'react';
import TodoInput from './components/TodoInput';
import TodoList from './components/TodoList';
import AuthPage from './components/AuthPage';
import * as api from './api/todoApi';
import * as auth from './api/authApi';
import type { User } from './api/authApi';
import type { Todo, Category, Priority } from './types/todo';
import { CATEGORIES } from './types/todo';

type Filter = 'all' | Category;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [welcome, setWelcome] = useState<string | null>(null);

  // 启动时检查是否已登录
  useEffect(() => {
    auth
      .me()
      .then((u) => setUser(u))
      .finally(() => setAuthChecked(true));
  }, []);

  // 登录后拉取该用户的待办
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api
      .listTodos()
      .then(setTodos)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [user]);

  async function refresh() {
    const latest = await api.listTodos();
    setTodos(latest);
  }

  async function handleAdd(title: string, category: Category, priority: Priority, dueDate: string | null) {
    try {
      await api.createTodo({ title, category, priority, due_date: dueDate });
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

  async function handleLogout() {
    await auth.logout();
    setUser(null);
    setTodos([]);
    setWelcome(null);
    setFilter('all');
  }

  function handleAuthed(u: User, claimed?: number) {
    setUser(u);
    if (claimed && claimed > 0) {
      setWelcome(`欢迎 ${u.username}！已为你接管 ${claimed} 条原有待办。`);
    }
  }

  // 启动时还没拿到 /me 的结果，避免闪登录页
  if (!authChecked) {
    return <p className="text-center text-gray-400 py-20">加载中...</p>;
  }

  if (!user) {
    return <AuthPage onAuthed={handleAuthed} />;
  }

  const filteredTodos =
    filter === 'all' ? todos : todos.filter((t) => t.category === filter);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white shadow-md rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📝 TODO List</h1>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <span>你好，{user.username}</span>
            <button
              onClick={handleLogout}
              className="text-blue-500 hover:text-blue-700 hover:underline"
            >
              退出
            </button>
          </div>
        </div>

        {welcome && (
          <div className="mb-4 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded border border-blue-200">
            {welcome}
            <button
              onClick={() => setWelcome(null)}
              className="float-right text-blue-400 hover:text-blue-700"
            >
              ✕
            </button>
          </div>
        )}

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
