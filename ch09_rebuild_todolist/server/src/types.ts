// 一条待办事项
export interface Todo {
  id: number;
  title: string;
  done: boolean;
  createdAt: string; // ISO 字符串
}

export interface CreateTodoInput {
  title: string;
}

export interface UpdateTodoInput {
  title?: string;
  done?: boolean;
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
