// 一条待办事项
export interface Todo {
  id: number;
  title: string;
  done: boolean;
  createdAt: string; // ISO 字符串
  category: string | null;
  priority: 1 | 2 | 3 | null;
  dueDate: string | null; // ISO YYYY-MM-DD
}

export interface CreateTodoInput {
  title: string;
  category?: string | null;
  priority?: 1 | 2 | 3 | null;
  dueDate?: string | null;
}

// PATCH 语义：undefined = 不动，null = 清空，具体值 = 更新
export interface UpdateTodoInput {
  title?: string;
  done?: boolean;
  category?: string | null;
  priority?: 1 | 2 | 3 | null;
  dueDate?: string | null;
}

// 用户（不含密码哈希）
export interface User {
  id: number;
  username: string;
  createdAt: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
}

// 扩展 express-session：在 session 中存当前登录用户的 id
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}
