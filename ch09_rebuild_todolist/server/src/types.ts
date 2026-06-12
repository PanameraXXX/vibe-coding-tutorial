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
