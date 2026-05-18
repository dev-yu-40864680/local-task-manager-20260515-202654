import type { Task, TaskPriority, TaskStatus } from './types';
import type { UiMessageReason } from './messages';
import { TASK_LIMIT } from './types';

const STORAGE_KEY = 'local-task-manager:tasks:v1';

const VALID_STATUS: TaskStatus[] = ['todo', 'in_progress', 'done'];
const VALID_PRIORITY: TaskPriority[] = ['low', 'medium', 'high'];

export type LoadResult =
  | { kind: 'ok'; tasks: Task[] }
  | { kind: 'empty' }
  | { kind: 'corrupted'; reason: Extract<UiMessageReason, 'corrupted_storage'> };

export type StorageFailureCause = 'quota_exceeded' | 'storage_unavailable' | 'unknown';

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: Extract<UiMessageReason, 'save_failed'>; cause: StorageFailureCause };

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function validateTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!isString(o.id) || !isString(o.title)) return null;
  if (!isString(o.description)) return null;
  if (!VALID_PRIORITY.includes(o.priority as TaskPriority)) return null;
  if (!VALID_STATUS.includes(o.status as TaskStatus)) return null;
  if (o.dueDate !== null && !isString(o.dueDate)) return null;
  if (!Array.isArray(o.tags) || !o.tags.every(isString)) return null;
  if (!isString(o.createdAt) || !isString(o.updatedAt)) return null;
  return {
    id: o.id,
    title: o.title,
    description: o.description,
    priority: o.priority as TaskPriority,
    status: o.status as TaskStatus,
    dueDate: o.dueDate as string | null,
    tags: o.tags as string[],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt
  };
}

export function loadTasks(): LoadResult {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    return { kind: 'corrupted', reason: 'corrupted_storage' };
  }
  if (raw === null) return { kind: 'empty' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'corrupted', reason: 'corrupted_storage' };
  }
  if (!Array.isArray(parsed)) {
    return { kind: 'corrupted', reason: 'corrupted_storage' };
  }
  if (parsed.length > TASK_LIMIT) {
    return { kind: 'corrupted', reason: 'corrupted_storage' };
  }
  const tasks: Task[] = [];
  for (const item of parsed) {
    const validated = validateTask(item);
    if (!validated) {
      return { kind: 'corrupted', reason: 'corrupted_storage' };
    }
    tasks.push(validated);
  }
  return { kind: 'ok', tasks };
}

function classifyStorageError(err: unknown): StorageFailureCause {
  if (err instanceof DOMException) {
    if (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      return 'quota_exceeded';
    }
    if (err.name === 'SecurityError') {
      return 'storage_unavailable';
    }
  }
  return 'unknown';
}

export function saveTasks(tasks: Task[]): SaveResult {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return { ok: true };
  } catch (err) {
    console.error('localStorage 保存に失敗しました', err);
    return { ok: false, reason: 'save_failed', cause: classifyStorageError(err) };
  }
}

export function clearTasks(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('localStorage クリアに失敗しました', err);
  }
}
