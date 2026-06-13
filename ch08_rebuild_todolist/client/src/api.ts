import type { Todo, User } from './types';

const TODOS = '/api/todos';
const AUTH = '/api/auth';

// 统一带上 cookie，session 才能跑通
function authedFetch(url: string, init?: RequestInit) {
  return fetch(url, { ...init, credentials: 'include' });
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    // 优先用后端返回的 { error } 字段；解析失败再退回到 statusText
    let message = res.statusText || `请求失败（${res.status}）`;
    try {
      const data = await res.json();
      if (data && typeof data.error === 'string') message = data.error;
    } catch {
      // 非 JSON 响应，保持兜底文案
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// --- todos ---

export interface Filters {
  done: 'all' | 'active' | 'done';
  category: string;
  priority: '' | '1' | '2' | '3';
  due: '' | 'today' | 'week' | 'overdue' | 'none';
  q: string;
}

function buildQueryString(f: Filters): string {
  const params = new URLSearchParams();
  if (f.done !== 'all') params.set('done', f.done);
  if (f.category) params.set('category', f.category);
  if (f.priority) params.set('priority', f.priority);
  if (f.due) params.set('due', f.due);
  if (f.q) params.set('q', f.q);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function fetchTodos(filters?: Filters): Promise<Todo[]> {
  const qs = filters ? buildQueryString(filters) : '';
  return handle<Todo[]>(await authedFetch(`${TODOS}${qs}`));
}

export async function createTodo(input: {
  title: string;
  category?: string | null;
  priority?: 1 | 2 | 3 | null;
  dueDate?: string | null;
}): Promise<Todo> {
  return handle<Todo>(
    await authedFetch(TODOS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  );
}

export type UpdateTodoPatch = {
  title?: string;
  done?: boolean;
  category?: string | null;
  priority?: 1 | 2 | 3 | null;
  dueDate?: string | null;
};

export async function updateTodo(id: number, patch: UpdateTodoPatch): Promise<Todo> {
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
