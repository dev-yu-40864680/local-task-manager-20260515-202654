// src/storage.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UI_MESSAGES } from './messages';
import { loadTasks, saveTasks, clearTasks } from './storage';
import { TASK_LIMIT, type Task } from './types';

const MOCK_TASK_BASE: Task = {
  id: 'task-1',
  title: 'Test Task',
  description: '',
  priority: 'medium',
  status: 'todo',
  dueDate: null,
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const realLocalStorage = window.localStorage;

function mockSetItemFailure(err: unknown): void {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: realLocalStorage.getItem.bind(realLocalStorage),
      removeItem: realLocalStorage.removeItem.bind(realLocalStorage),
      clear: realLocalStorage.clear.bind(realLocalStorage),
      setItem: vi.fn(() => {
        throw err;
      }),
    },
  });
}

describe('storage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    clearTasks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: realLocalStorage,
    });
  });

  it('keeps UI message keys aligned with storage reasons', () => {
    expect(Object.keys(UI_MESSAGES).sort()).toEqual([
      'corrupted_storage',
      'limit_reached',
      'save_failed',
    ]);
  });

  it('should return "empty" when no data is in localStorage', () => {
    const result = loadTasks();
    expect(result.kind).toBe('empty');
  });

  it('should save and load tasks correctly', () => {
    const tasks: Task[] = [
        { ...MOCK_TASK_BASE, id: '1' },
        { ...MOCK_TASK_BASE, id: '2', title: 'Another Task' },
    ];
    expect(saveTasks(tasks)).toEqual({ ok: true });

    const result = loadTasks();
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
        expect(result.tasks).toEqual(tasks);
    }
  });

  it('should return "corrupted" for invalid JSON', () => {
    localStorage.setItem('local-task-manager:tasks:v1', 'not a json');
    const result = loadTasks();
    expect(result.kind).toBe('corrupted');
    if (result.kind === 'corrupted') {
        expect(result.reason).toBe('corrupted_storage');
    }
  });

  it('should return "corrupted" for non-array data', () => {
    localStorage.setItem('local-task-manager:tasks:v1', JSON.stringify({ a: 1 }));
    const result = loadTasks();
    expect(result.kind).toBe('corrupted');
     if (result.kind === 'corrupted') {
        expect(result.reason).toBe('corrupted_storage');
    }
  });

  it('should return "corrupted" if a task has an invalid schema', () => {
    const invalidTask = { ...MOCK_TASK_BASE, status: 'invalid_status' };
    localStorage.setItem('local-task-manager:tasks:v1', JSON.stringify([invalidTask]));
    
    const result = loadTasks();
    expect(result.kind).toBe('corrupted');
    if (result.kind === 'corrupted') {
        expect(result.reason).toBe('corrupted_storage');
    }
  });

  it('should return "corrupted" if a task is missing required fields', () => {
    const invalidTask = { id: '1', title: 'only title' };
    localStorage.setItem('local-task-manager:tasks:v1', JSON.stringify([invalidTask]));

    const result = loadTasks();
    expect(result.kind).toBe('corrupted');
    if (result.kind === 'corrupted') {
        expect(result.reason).toBe('corrupted_storage');
    }
  });

  it('should return "corrupted" when stored data exceeds the task limit', () => {
    const tasks = Array.from({ length: TASK_LIMIT + 1 }, (_, i) => ({
      ...MOCK_TASK_BASE,
      id: `task-${i}`,
    }));
    localStorage.setItem('local-task-manager:tasks:v1', JSON.stringify(tasks));

    const result = loadTasks();
    expect(result.kind).toBe('corrupted');
    if (result.kind === 'corrupted') {
      expect(result.reason).toBe('corrupted_storage');
    }
  });

  it('should classify quota exceeded save failures', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSetItemFailure(new DOMException('Quota exceeded', 'QuotaExceededError'));

    expect(saveTasks([{ ...MOCK_TASK_BASE, id: 'quota' }])).toEqual({
      ok: false,
      reason: 'save_failed',
      cause: 'quota_exceeded',
    });
  });

  it('should classify unavailable storage save failures', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSetItemFailure(new DOMException('Blocked', 'SecurityError'));

    expect(saveTasks([{ ...MOCK_TASK_BASE, id: 'security' }])).toEqual({
      ok: false,
      reason: 'save_failed',
      cause: 'storage_unavailable',
    });
  });

  it('should classify unknown save failures', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSetItemFailure(new Error('Unexpected failure'));

    expect(saveTasks([{ ...MOCK_TASK_BASE, id: 'unknown' }])).toEqual({
      ok: false,
      reason: 'save_failed',
      cause: 'unknown',
    });
  });
});
