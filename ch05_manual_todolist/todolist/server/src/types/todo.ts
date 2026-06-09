// 待办事项的类型定义（前后端共享结构）
export type Category = 'personal' | 'work' | 'study' | 'other';
export type Priority = 'high' | 'medium' | 'low';

export const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'personal', label: '个人', color: 'bg-blue-500' },
  { value: 'work',    label: '工作', color: 'bg-green-500' },
  { value: 'study',   label: '学习', color: 'bg-purple-500' },
  { value: 'other',   label: '其他', color: 'bg-gray-400' },
];

// 优先级排序权重（数字越大越靠前）
export const PRIORITY_SORT: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const PRIORITIES: { value: Priority; label: string; borderClass: string }[] = [
  { value: 'high',   label: '高', borderClass: 'border-l-red-500' },
  { value: 'medium', label: '中', borderClass: 'border-l-amber-400' },
  { value: 'low',    label: '低', borderClass: 'border-l-gray-200' },
];

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  category: Category;
  priority: Priority;
  created_at: string;
}

export interface CreateTodoInput {
  title: string;
  category?: Category;
  priority?: Priority;
}

export interface UpdateTodoInput {
  title?: string;
  completed?: boolean;
  category?: Category;
  priority?: Priority;
}