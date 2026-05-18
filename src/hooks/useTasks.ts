import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UiMessageReason } from '../messages';
import { clearTasks, loadTasks, saveTasks } from '../storage';
import type { StorageFailureCause } from '../storage';
import type { Task, TaskStatus } from '../types';
import { TASK_LIMIT } from '../types';

export type DraftTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

export type AddTaskResult =
  | { ok: true; task: Task }
  | { ok: false; reason: Extract<UiMessageReason, 'limit_reached'> }
  | { ok: false; reason: Extract<UiMessageReason, 'save_failed'>; cause: StorageFailureCause };

export interface UseTasksApi {
  tasks: Task[];
  ready: boolean;
  corruptionMessage: Extract<UiMessageReason, 'corrupted_storage'> | null;
  saveErrorMessage: Extract<UiMessageReason, 'save_failed'> | null;
  acknowledgeCorruption: () => void;
  acknowledgeSaveError: () => void;
  addTask: (draft: DraftTask) => AddTaskResult;
  updateTask: (id: string, patch: Partial<DraftTask>) => void;
  removeTask: (id: string) => void;
  setStatus: (id: string, status: TaskStatus) => void;
  toggleComplete: (id: string) => void;
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `tsk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useTasks(): UseTasksApi {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [corruptionMessage, setCorruptionMessage] = useState<
    Extract<UiMessageReason, 'corrupted_storage'> | null
  >(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<
    Extract<UiMessageReason, 'save_failed'> | null
  >(null);
  const tasksRef = useRef<Task[]>([]);

  useEffect(() => {
    const result = loadTasks();
    if (result.kind === 'ok') {
      tasksRef.current = result.tasks;
      setTasks(result.tasks);
    } else if (result.kind === 'corrupted') {
      clearTasks();
      tasksRef.current = [];
      setTasks([]);
      setCorruptionMessage(result.reason);
    }
    setReady(true);
  }, []);

  const commitTasks = useCallback((next: Task[]) => {
    const saveResult = saveTasks(next);
    if (!saveResult.ok) {
      setSaveErrorMessage(saveResult.reason);
      return saveResult;
    }
    setSaveErrorMessage(null);
    tasksRef.current = next;
    setTasks(next);
    return saveResult;
  }, []);

  const addTask = useCallback<UseTasksApi['addTask']>(
    (draft) => {
      if (tasksRef.current.length >= TASK_LIMIT) {
        return { ok: false, reason: 'limit_reached' };
      }
      const now = new Date().toISOString();
      const task: Task = {
        id: genId(),
        ...draft,
        createdAt: now,
        updatedAt: now
      };
      const next = [task, ...tasksRef.current];
      const saveResult = commitTasks(next);
      if (!saveResult.ok) {
        return { ok: false, reason: saveResult.reason, cause: saveResult.cause };
      }
      return { ok: true, task };
    },
    [commitTasks]
  );

  const updateTask = useCallback<UseTasksApi['updateTask']>((id, patch) => {
    const next = tasksRef.current.map((t) =>
      t.id === id
        ? {
            ...t,
            ...patch,
            updatedAt: new Date().toISOString()
          }
        : t
    );
    commitTasks(next);
  }, [commitTasks]);

  const removeTask = useCallback<UseTasksApi['removeTask']>((id) => {
    commitTasks(tasksRef.current.filter((t) => t.id !== id));
  }, [commitTasks]);

  const setStatus = useCallback<UseTasksApi['setStatus']>((id, status) => {
    const next = tasksRef.current.map((t) =>
      t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
    );
    commitTasks(next);
  }, [commitTasks]);

  const toggleComplete = useCallback<UseTasksApi['toggleComplete']>((id) => {
    const next = tasksRef.current.map((t) => {
      if (t.id !== id) return t;
      const nextStatus: TaskStatus = t.status === 'done' ? 'todo' : 'done';
      return { ...t, status: nextStatus, updatedAt: new Date().toISOString() };
    });
    commitTasks(next);
  }, [commitTasks]);

  const acknowledgeCorruption = useCallback(() => setCorruptionMessage(null), []);
  const acknowledgeSaveError = useCallback(() => setSaveErrorMessage(null), []);

  return useMemo<UseTasksApi>(
    () => ({
      tasks,
      ready,
      corruptionMessage,
      saveErrorMessage,
      acknowledgeCorruption,
      acknowledgeSaveError,
      addTask,
      updateTask,
      removeTask,
      setStatus,
      toggleComplete
    }),
    [
      tasks,
      ready,
      corruptionMessage,
      saveErrorMessage,
      acknowledgeCorruption,
      acknowledgeSaveError,
      addTask,
      updateTask,
      removeTask,
      setStatus,
      toggleComplete
    ]
  );
}
