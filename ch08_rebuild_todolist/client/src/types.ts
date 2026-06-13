export interface Todo {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
  category: string | null;
  priority: 1 | 2 | 3 | null;
  dueDate: string | null;
}

export interface User {
  id: number;
  username: string;
  createdAt: string;
}
