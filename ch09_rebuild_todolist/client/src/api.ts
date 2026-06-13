import type { Todo, User } from './types';

const TODOS = '/api/todos';
const AUTH = '/api/auth';

// 统一带上 cookie，session 才能跑通
function authedFetch(url: string, init?: RequestInit) {
  return fetch(url, { ...init, credentials: 'include' });
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// --- todos ---

export async function fetchTodos(): Promise<Todo[]> {
  return handle<Todo[]>(await authedFetch(TODOS));
}

export async function createTodo(title: string): Promise<Todo> {
  return handle<Todo>(
    await authedFetch(TODOS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  );
}

export async function updateTodo(
  id: number,
  patch: Partial<Pick<Todo, 'title' | 'done'>>
): Promise<Todo> {
  return handle<Todo>(
    await authedFetch(`${TODOS}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  );
}

export async function deleteTodo(id: number): Promise<void> {
  return handle<void>(
    await authedFetch(`${TODOS}/${id}`, { method: 'DELETE' })
  );
}

// --- auth ---

export async function register(username: string, password: string): Promise<User> {
  return handle<User>(
    await authedFetch(`${AUTH}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  );
}

export async function login(username: string, password: string): Promise<User> {
  return handle<User>(
    await authedFetch(`${AUTH}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  );
}

export async function logout(): Promise<void> {
  return handle<void>(
    await authedFetch(`${AUTH}/logout`, { method: 'POST' })
  );
}

// 启动时探活：返回当前用户，未登录返回 null
export async function me(): Promise<User | null> {
  const res = await authedFetch(`${AUTH}/me`);
  if (res.status === 401) return null;
  return handle<User>(res);
}
