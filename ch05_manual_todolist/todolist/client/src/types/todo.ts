// 待办事项类型（与后端保持一致）
export type Category = 'personal' | 'work' | 'study' | 'other';
export type Priority = 'high' | 'medium' | 'low';

export const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'personal', label: '个人', color: 'bg-blue-500' },
  { value: 'work',    label: '工作', color: 'bg-green-500' },
  { value: 'study',   label: '学习', color: 'bg-purple-500' },
  { value: 'other',   label: '其他', color: 'bg-gray-400' },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c])
) as Record<Category, (typeof CATEGORIES)[number]>;

export const PRIORITIES: { value: Priority; label: string; borderClass: string; dotColor: string }[] = [
  { value: 'high',   label: '高', borderClass: 'border-l-red-500',   dotColor: 'bg-red-500' },
  { value: 'medium', label: '中', borderClass: 'border-l-amber-400', dotColor: 'bg-amber-400' },
  { value: 'low',    label: '低', borderClass: 'border-l-gray-200',  dotColor: 'bg-gray-300' },
];

export const PRIORITY_MAP = Object.fromEntries(
  PRIORITIES.map((p) => [p.value, p])
) as Record<Priority, (typeof PRIORITIES)[number]>;

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