// 登录/注册卡片：两个 tab 切换
import { useState, type FormEvent } from 'react';
import * as auth from '../api/authApi';
import type { User } from '../api/authApi';

interface Props {
  onAuthed: (user: User, claimed?: number) => void;
}

type Mode = 'login' | 'register';

export default function AuthPage({ onAuthed }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') {
        const { user } = await auth.login(username, password);
        onAuthed(user);
      } else {
        const { user, claimed } = await auth.register(username, password);
        onAuthed(user, claimed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-sm mx-auto bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          📝 TODO List
        </h1>

        <div className="flex gap-1 mb-5 border-b border-gray-200">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); }}
              className={`px-4 py-2 text-sm transition ${
                mode === m
                  ? 'text-blue-600 border-b-2 border-blue-500 font-medium'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {m === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="用户名 (3-20 位字母数字下划线)"
            autoComplete="username"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码 (至少 6 位)"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          {error && (
            <div className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {submitting ? '处理中...' : mode === 'login' ? '登录' : '注册并登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
