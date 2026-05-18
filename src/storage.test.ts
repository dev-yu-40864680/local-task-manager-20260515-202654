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

  // New test cases for Security Agent's findings
  it('should return "corrupted" for a task with an excessively long title', () => {
    const longTitleTask = { ...MOCK_TASK_BASE, title: 'a'.repeat(121) }; // Exceeds 120 char limit
    localStorage.setItem('local-task-manager:tasks:v1', JSON.stringify([longTitleTask]));

    const result = loadTasks();
    expect(result.kind).toBe('corrupted');
    if (result.kind === 'corrupted') {
      expect(result.reason).toBe('corrupted_storage');
    }
  });

  it('should return "corrupted" for a task with an excessively long description', () => {
    const longDescTask = { ...MOCK_TASK_BASE, description: 'a'.repeat(2001) }; // Exceeds 2000 char limit
    localStorage.setItem('local-task-manager:tasks:v1', JSON.stringify([longDescTask]));

    const result = loadTasks();
    expect(result.kind).toBe('corrupted');
    if (result.kind === 'corrupted') {
      expect(result.reason).toBe('corrupted_storage');
    }
  });

  it('should return "corrupted" for a task with an excessively long ID', () => {
    const longIdTask = { ...MOCK_TASK_BASE, id: 'a'.repeat(200) }; // Arbitrary long ID
    localStorage.setItem('local-task-manager:tasks:v1', JSON.stringify([longIdTask]));

    const result = loadTasks();
    expect(result.kind).toBe('corrupted');
    if (result.kind === 'corrupted') {
      expect(result.reason).toBe('corrupted_storage');
    }
  });

  it('should return "corrupted" for a task with an excessively long createdAt timestamp', () => {
    const longCreatedAtTask = { ...MOCK_TASK_BASE, createdAt: 'a'.repeat(200) }; // Arbitrary long timestamp
    localStorage.setItem('local-task-manager:tasks:v1', JSON.stringify([longCreatedAtTask]));

    const result = loadTasks();
    expect(result.kind).toBe('corrupted');
    if (result.kind === 'corrupted') {
      expect(result.reason).toBe('corrupted_storage');
    }
  });

  it('should return "corrupted" for a task with an excessively long updatedAt timestamp', () => {
    const longUpdatedAtTask = { ...MOCK_TASK_BASE, updatedAt: 'a'.repeat(200) }; // Arbitrary long timestamp
    localStorage.setItem('local-task-manager:tasks:v1', JSON.stringify([longUpdatedAtTask]));

    const result = loadTasks();
    expect(result.kind).toBe('corrupted');
    if (result.kind === 'corrupted') {
      expect(result.reason).toBe('corrupted_storage');
    }
  });

  it('should return "corrupted" for a task with an invalid dueDate format', () => {
    const invalidDueDateTask = { ...MOCK_TASK_BASE, dueDate: '2023/12/31' }; // Invalid format, expects YYYY-MM-DD
    localStorage.setItem('local-task-manager:tasks:v1', JSON.stringify([invalidDueDateTask]));

    const result = loadTasks();
    expect(result.kind).toBe('corrupted');
    if (result.kind === 'corrupted') {
      expect(result.reason).toBe('corrupted_storage');
    }
  });

  it('should return "corrupted" for a task with an excessive number of tags', () => {
    const manyTagsTask = { ...MOCK_TASK_BASE, tags: Array.from({ length: 20 }, (_, i) => `tag-${i}`) }; // More than a reasonable limit, e.g. 10
    localStorage.setItem('local-task-manager:tasks:v1', JSON.stringify([manyTagsTask]));

    const result = loadTasks();
    expect(result.kind).toBe('corrupted');
    if (result.kind === 'corrupted') {
      expect(result.reason).toBe('corrupted_storage');
    }
  });

  it('should return "corrupted" for a task with an excessively long tag', () => {
    const longTagTask = { ...MOCK_TASK_BASE, tags: ['a'.repeat(51)] }; // Arbitrary long tag, e.g. > 50 chars
    localStorage.setItem('local-task-manager:tasks:v1', JSON.stringify([longTagTask]));

    const result = loadTasks();
    expect(result.kind).toBe('corrupted');
    if (result.kind === 'corrupted') {
      expect(result.reason).toBe('corrupted_storage');
    }
  });
});
