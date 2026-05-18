import { useEffect, useMemo, useState } from 'react';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskModal } from './components/TaskModal';
import { FilterBar, type FilterState } from './components/FilterBar';
import { useTasks, type DraftTask } from './hooks/useTasks';
import { UI_MESSAGES } from './messages';
import type { Task, TaskStatus } from './types';
import { PRIORITY_ORDER, STATUS_ORDER, TASK_LIMIT } from './types';

const defaultFilter: FilterState = {
  query: '',
  priority: 'all',
  tag: '',
  due: 'all'
};

function isDueWithin(date: string | null, days: number): boolean {
  if (!date) return false;
  const due = new Date(`${date}T23:59:59`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = Math.floor((due.getTime() - now.getTime()) / dayMs);
  return diff >= 0 && diff <= days;
}

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  const due = new Date(`${date}T23:59:59`);
  return due.getTime() < Date.now();
}

function isDueToday(date: string | null): boolean {
  if (!date) return false;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return date === `${yyyy}-${mm}-${dd}`;
}

function applyFilter(tasks: Task[], filter: FilterState): Task[] {
  const q = filter.query.trim().toLowerCase();
  return tasks.filter((t) => {
    if (filter.priority !== 'all' && t.priority !== filter.priority) return false;
    if (filter.tag !== '' && !t.tags.includes(filter.tag)) return false;
    if (filter.due === 'overdue' && !isOverdue(t.dueDate)) return false;
    if (filter.due === 'today' && !isDueToday(t.dueDate)) return false;
    if (filter.due === 'week' && !isDueWithin(t.dueDate, 7)) return false;
    if (filter.due === 'none' && t.dueDate !== null) return false;
    if (q !== '') {
      const haystack = [t.title, t.description, t.tags.join(' ')].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function sortForBoard(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const pa = PRIORITY_ORDER.indexOf(a.priority);
    const pb = PRIORITY_ORDER.indexOf(b.priority);
    if (pa !== pb) return pa - pb;
    const da = a.dueDate ? Date.parse(a.dueDate) : Number.POSITIVE_INFINITY;
    const db = b.dueDate ? Date.parse(b.dueDate) : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export default function App() {
  const api = useTasks();
  const [filter, setFilter] = useState<FilterState>(defaultFilter);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    api.tasks.forEach((t) => t.tags.forEach((tag) => set.add(tag)));
    return [...set].sort();
  }, [api.tasks]);

  const filtered = useMemo(() => applyFilter(api.tasks, filter), [api.tasks, filter]);

  const tasksByStatus = useMemo(() => {
    const buckets: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const t of filtered) buckets[t.status].push(t);
    for (const s of STATUS_ORDER) buckets[s] = sortForBoard(buckets[s]);
    return buckets;
  }, [filtered]);

  useEffect(() => {
    if (limitError === null) return;
    const id = window.setTimeout(() => setLimitError(null), 6000);
    return () => window.clearTimeout(id);
  }, [limitError]);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setModalOpen(true);
  };

  const handleSubmit = (draft: DraftTask, id: string | null) => {
    if (id) {
      api.updateTask(id, draft);
      setModalOpen(false);
      setEditing(null);
      return;
    }
    const res = api.addTask(draft);
    if (!res.ok) {
      if (res.reason === 'limit_reached') {
        setLimitError(UI_MESSAGES[res.reason]);
      }
      return;
    }
    setModalOpen(false);
  };

  const remainingSlots = TASK_LIMIT - api.tasks.length;
  const usageRatio = api.tasks.length / TASK_LIMIT;
  const usageTone = usageRatio >= 1 ? 'danger' : usageRatio >= 0.9 ? 'warn' : 'ok';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <h1>Local Task Manager</h1>
          <p className="brand-sub">ブラウザ内に保存される個人用タスク管理</p>
        </div>
        <div className="header-actions">
          <span className={`usage-badge tone-${usageTone}`} aria-label="件数">
            {api.tasks.length} / {TASK_LIMIT}
          </span>
          <button
            type="button"
            className="btn-primary"
            onClick={openNew}
            disabled={remainingSlots <= 0}
            title={remainingSlots <= 0 ? '上限に達しています' : '新規タスク'}
          >
            ＋ 新規タスク
          </button>
        </div>
      </header>

      {api.corruptionMessage && (
        <div className="banner banner-warn" role="alert">
          <strong>保存データが破損していました。</strong>
          <span>{UI_MESSAGES[api.corruptionMessage]}</span>
          <button type="button" className="btn-ghost-sm" onClick={api.acknowledgeCorruption}>
            閉じる
          </button>
        </div>
      )}

      {limitError && (
        <div className="banner banner-error" role="alert">
          <strong>追加できません:</strong>
          <span>{limitError}</span>
          <button type="button" className="btn-ghost-sm" onClick={() => setLimitError(null)}>
            閉じる
          </button>
        </div>
      )}

      {api.saveErrorMessage && (
        <div className="banner banner-error" role="alert">
          <strong>保存できません:</strong>
          <span>{UI_MESSAGES[api.saveErrorMessage]}</span>
          <button type="button" className="btn-ghost-sm" onClick={api.acknowledgeSaveError}>
            閉じる
          </button>
        </div>
      )}

      <FilterBar
        value={filter}
        onChange={setFilter}
        allTags={allTags}
        onReset={() => setFilter(defaultFilter)}
      />

      {api.tasks.length === 0 ? (
        <div className="empty-state">
          <p>タスクがまだありません。「＋ 新規タスク」から追加してください。</p>
        </div>
      ) : (
        <KanbanBoard
          tasksByStatus={tasksByStatus}
          onEdit={openEdit}
          onDelete={(task) => setConfirmDelete(task)}
          onToggleComplete={(task) => api.toggleComplete(task.id)}
          onMove={(id, status) => api.setStatus(id, status)}
        />
      )}

      <TaskModal
        open={modalOpen}
        initialTask={editing}
        knownTags={allTags}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      {confirmDelete && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmDelete(null)}
        >
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h2>タスクを削除</h2>
            <p>
              「<strong>{confirmDelete.title}</strong>」を削除します。元に戻せません。
            </p>
            <footer className="modal-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setConfirmDelete(null)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  api.removeTask(confirmDelete.id);
                  setConfirmDelete(null);
                }}
              >
                削除する
              </button>
            </footer>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <span>データは端末ローカルにのみ保存されます。</span>
      </footer>
    </div>
  );
}
