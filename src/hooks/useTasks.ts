import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clearTasks, loadTasks, saveTasks } from '../storage';
import type { Task, TaskStatus } from '../types';
import { TASK_LIMIT } from '../types';

export type DraftTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

export interface UseTasksApi {
  tasks: Task[];
  ready: boolean;
  corruptionMessage: string | null;
  acknowledgeCorruption: () => void;
  addTask: (draft: DraftTask) => { ok: true; task: Task } | { ok: false; error: string };
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
  const [corruptionMessage, setCorruptionMessage] = useState<string | null>(null);
  const initial = useRef(true);

  useEffect(() => {
    const result = loadTasks();
    if (result.kind === 'ok') {
      setTasks(result.tasks);
    } else if (result.kind === 'corrupted') {
      clearTasks();
      setTasks([]);
      setCorruptionMessage(result.reason);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (initial.current) {
      initial.current = false;
      return;
    }
    saveTasks(tasks);
  }, [tasks, ready]);

  const addTask = useCallback<UseTasksApi['addTask']>(
    (draft) => {
      if (tasks.length >= TASK_LIMIT) {
        return {
          ok: false,
          error: `タスクは最大 ${TASK_LIMIT} 件までです。不要なタスクを削除してください。`
        };
      }
      const now = new Date().toISOString();
      const task: Task = {
        id: genId(),
        ...draft,
        createdAt: now,
        updatedAt: now
      };
      setTasks((prev) => [task, ...prev]);
      return { ok: true, task };
    },
    [tasks.length]
  );

  const updateTask = useCallback<UseTasksApi['updateTask']>((id, patch) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              ...patch,
              updatedAt: new Date().toISOString()
            }
          : t
      )
    );
  }, []);

  const removeTask = useCallback<UseTasksApi['removeTask']>((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setStatus = useCallback<UseTasksApi['setStatus']>((id, status) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
      )
    );
  }, []);

  const toggleComplete = useCallback<UseTasksApi['toggleComplete']>((id) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextStatus: TaskStatus = t.status === 'done' ? 'todo' : 'done';
        return { ...t, status: nextStatus, updatedAt: new Date().toISOString() };
      })
    );
  }, []);

  const acknowledgeCorruption = useCallback(() => setCorruptionMessage(null), []);

  return useMemo<UseTasksApi>(
    () => ({
      tasks,
      ready,
      corruptionMessage,
      acknowledgeCorruption,
      addTask,
      updateTask,
      removeTask,
      setStatus,
      toggleComplete
    }),
    [tasks, ready, corruptionMessage, acknowledgeCorruption, addTask, updateTask, removeTask, setStatus, toggleComplete]
  );
}
