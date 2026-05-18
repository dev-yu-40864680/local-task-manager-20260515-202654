// src/hooks/useTasks.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTasks, DraftTask, type AddTaskResult } from './useTasks';
import * as storage from '../storage';
import { UI_MESSAGES } from '../messages';
import { TASK_LIMIT, Task } from '../types';

const MOCK_TASK_BASE: Omit<Task, 'id'> = {
  title: 'Test Task',
  description: '',
  priority: 'medium',
  status: 'todo',
  dueDate: null,
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Mock storage module
vi.mock('../storage');

const mockedStorage = vi.mocked(storage);

describe('useTasks hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset mocks and localStorage before each test
    vi.resetAllMocks();
    localStorage.clear();
    mockedStorage.loadTasks.mockReturnValue({ kind: 'empty' });
    mockedStorage.saveTasks.mockReturnValue({ ok: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty tasks when storage is empty', () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks).toEqual([]);
    expect(result.current.ready).toBe(true);
    expect(result.current.corruptionMessage).toBeNull();
    expect(result.current.saveErrorMessage).toBeNull();
  });

  it('should initialize with tasks from storage', () => {
    const storedTasks: Task[] = [{ ...MOCK_TASK_BASE, id: '1' }];
    mockedStorage.loadTasks.mockReturnValue({ kind: 'ok', tasks: storedTasks });
    
    const { result } = renderHook(() => useTasks());

    expect(result.current.tasks).toEqual(storedTasks);
    expect(result.current.ready).toBe(true);
  });

  it('should handle corrupted storage on init', () => {
    const reason = 'corrupted_storage';
    mockedStorage.loadTasks.mockReturnValue({ kind: 'corrupted', reason });

    const { result } = renderHook(() => useTasks());

    expect(result.current.tasks).toEqual([]);
    expect(result.current.corruptionMessage).toBe(reason);
    expect(mockedStorage.clearTasks).toHaveBeenCalledOnce();
    
    act(() => {
        result.current.acknowledgeCorruption();
    });
    
    expect(result.current.corruptionMessage).toBeNull();
  });

  it('should add a new task and save', () => {
    const { result } = renderHook(() => useTasks());
    const draft: DraftTask = {
      title: 'New Task',
      description: '',
      priority: 'high',
      status: 'todo',
      dueDate: null,
      tags: [],
    };

    act(() => {
      result.current.addTask(draft);
    });

    expect(result.current.tasks.length).toBe(1);
    expect(result.current.tasks[0].title).toBe('New Task');
    expect(mockedStorage.saveTasks).toHaveBeenCalledOnce();
    expect(mockedStorage.saveTasks).toHaveBeenCalledWith(result.current.tasks);
  });

  it('should not add a task if the limit is reached', () => {
    const initialTasks = Array.from({ length: TASK_LIMIT }, (_, i) => ({
      ...MOCK_TASK_BASE,
      id: `task-${i}`,
    }));
    mockedStorage.loadTasks.mockReturnValue({ kind: 'ok', tasks: initialTasks });
    
    const { result } = renderHook(() => useTasks());
    
    expect(result.current.tasks.length).toBe(TASK_LIMIT);

    let addResult: AddTaskResult | undefined;
    act(() => {
      addResult = result.current.addTask({ ...MOCK_TASK_BASE, title: 'overflow' });
    });

    expect(result.current.tasks.length).toBe(TASK_LIMIT);
    expect(addResult?.ok).toBe(false);
    expect(addResult).toEqual({ ok: false, reason: 'limit_reached' });
    expect(UI_MESSAGES.limit_reached).toBe('タスクは100件までです。既存タスクを削除してから追加してください。');
    expect(mockedStorage.saveTasks).not.toHaveBeenCalled();
  });

  it('should prevent same-cycle additions from exceeding the task limit', () => {
    const initialTasks = Array.from({ length: TASK_LIMIT - 1 }, (_, i) => ({
      ...MOCK_TASK_BASE,
      id: `task-${i}`,
    }));
    mockedStorage.loadTasks.mockReturnValue({ kind: 'ok', tasks: initialTasks });

    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks.length).toBe(TASK_LIMIT - 1);

    let firstResult: AddTaskResult | undefined;
    let secondResult: AddTaskResult | undefined;
    act(() => {
      firstResult = result.current.addTask({ ...MOCK_TASK_BASE, title: 'Task 100' });
      secondResult = result.current.addTask({ ...MOCK_TASK_BASE, title: 'Task 101' });
    });

    expect(result.current.tasks.length).toBe(TASK_LIMIT);
    expect(firstResult?.ok).toBe(true);
    expect(secondResult).toEqual({ ok: false, reason: 'limit_reached' });
    expect(mockedStorage.saveTasks).toHaveBeenCalledOnce();
  });

  it('should not add a task when saving fails', () => {
    mockedStorage.saveTasks.mockReturnValue({
      ok: false,
      reason: 'save_failed',
      cause: 'quota_exceeded',
    });

    const { result } = renderHook(() => useTasks());
    let addResult: AddTaskResult | undefined;
    act(() => {
      addResult = result.current.addTask({ ...MOCK_TASK_BASE, title: 'Unsaved Task' });
    });

    expect(result.current.tasks.length).toBe(0);
    expect(result.current.saveErrorMessage).toBe('save_failed');
    expect(addResult).toEqual({
      ok: false,
      reason: 'save_failed',
      cause: 'quota_exceeded',
    });

    act(() => {
      result.current.acknowledgeSaveError();
    });

    expect(result.current.saveErrorMessage).toBeNull();
  });

  it('should surface save failures from updates without changing state', () => {
    const initialTasks: Task[] = [{ ...MOCK_TASK_BASE, id: '1' }];
    mockedStorage.loadTasks.mockReturnValue({ kind: 'ok', tasks: initialTasks });
    mockedStorage.saveTasks.mockReturnValue({
      ok: false,
      reason: 'save_failed',
      cause: 'unknown',
    });

    const { result } = renderHook(() => useTasks());

    act(() => {
      result.current.updateTask('1', { title: 'Will Not Save' });
    });

    expect(result.current.tasks[0].title).toBe('Test Task');
    expect(result.current.saveErrorMessage).toBe('save_failed');
  });

  it('should update a task', () => {
     const initialTasks: Task[] = [{ ...MOCK_TASK_BASE, id: '1' }];
     mockedStorage.loadTasks.mockReturnValue({ kind: 'ok', tasks: initialTasks });
     const { result } = renderHook(() => useTasks());

     act(() => {
         result.current.updateTask('1', { title: 'Updated Title' });
     });

     expect(result.current.tasks[0].title).toBe('Updated Title');
     expect(mockedStorage.saveTasks).toHaveBeenCalledOnce();
  });

  it('should remove a task', () => {
    const initialTasks: Task[] = [{ ...MOCK_TASK_BASE, id: '1' }];
    mockedStorage.loadTasks.mockReturnValue({ kind: 'ok', tasks: initialTasks });
    const { result } = renderHook(() => useTasks());

    act(() => {
      result.current.removeTask('1');
    });

    expect(result.current.tasks.length).toBe(0);
    expect(mockedStorage.saveTasks).toHaveBeenCalledOnce();
  });
  
  it('should toggle a task status from todo to done and back', () => {
    const initialTasks: Task[] = [{ ...MOCK_TASK_BASE, id: '1', status: 'todo' }];
    mockedStorage.loadTasks.mockReturnValue({ kind: 'ok', tasks: initialTasks });
    const { result } = renderHook(() => useTasks());

    act(() => {
      result.current.toggleComplete('1');
    });
    expect(result.current.tasks[0].status).toBe('done');

    act(() => {
      result.current.toggleComplete('1');
    });
    expect(result.current.tasks[0].status).toBe('todo');
  });
});
