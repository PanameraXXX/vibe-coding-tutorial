import type { Todo } from './types';

const BASE = '/api/todos';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchTodos(): Promise<Todo[]> {
  return handle<Todo[]>(await fetch(BASE));
}

export async function createTodo(title: string): Promise<Todo> {
  return handle<Todo>(
    await fetch(BASE, {
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
    await fetch(`${BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  );
}

export async function deleteTodo(id: number): Promise<void> {
  return handle<void>(await fetch(`${BASE}/${id}`, { method: 'DELETE' }));
}
