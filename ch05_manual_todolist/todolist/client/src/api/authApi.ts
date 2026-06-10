// 认证 API：注册 / 登录 / 登出 / 当前用户
export interface User {
  id: number;
  username: string;
  created_at: string;
}

const BASE = '/api/auth';
const credOpts: RequestInit = { credentials: 'include' };

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...credOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `请求失败 (${res.status})`);
  }
  return data as T;
}

export function register(username: string, password: string) {
  return postJson<{ user: User; claimed: number }>('/register', { username, password });
}

export function login(username: string, password: string) {
  return postJson<{ user: User }>('/login', { username, password });
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/logout`, { ...credOpts, method: 'POST' });
}

export async function me(): Promise<User | null> {
  const res = await fetch(`${BASE}/me`, credOpts);
  if (!res.ok) return null;
  const data = (await res.json()) as { user: User | null };
  return data.user;
}
