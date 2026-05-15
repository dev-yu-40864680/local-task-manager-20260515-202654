export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string | null;
  tags: string[];
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export const TASK_LIMIT = 100;

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'TODO',
  in_progress: '進行中',
  done: '完了'
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高'
};

export const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done'];
export const PRIORITY_ORDER: TaskPriority[] = ['high', 'medium', 'low'];
