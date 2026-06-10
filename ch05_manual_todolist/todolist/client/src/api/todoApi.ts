// 封装对后端 /api/todos 的 fetch 调用
import type { Todo, CreateTodoInput, UpdateTodoInput } from '../types/todo';

const BASE = '/api/todos';

// 统一处理响应：非 2xx 抛错
async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${msg || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// 所有请求带上 cookie，session 才能正常工作
const credOpts: RequestInit = { credentials: 'include' };

export async function listTodos(): Promise<Todo[]> {
  const res = await fetch(BASE, credOpts);
  return handle<Todo[]>(res);
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const res = await fetch(BASE, {
    ...credOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handle<Todo>(res);
}

export async function updateTodo(id: number, input: UpdateTodoInput): Promise<Todo> {
  const res = await fetch(`${BASE}/${id}`, {
    ...credOpts,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handle<Todo>(res);
}

export async function deleteTodo(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { ...credOpts, method: 'DELETE' });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
}
