import type { Task } from '../types';
import { PRIORITY_LABELS } from '../types';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDragStart: (task: Task, e: React.DragEvent<HTMLElement>) => void;
}

function formatDueDate(date: string | null): { label: string; tone: 'normal' | 'soon' | 'overdue' } {
  if (!date) return { label: '期限なし', tone: 'normal' };
  const due = new Date(`${date}T23:59:59`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = Math.floor((due.getTime() - today.getTime()) / dayMs);
  if (diff < 0) return { label: `期限超過 (${date})`, tone: 'overdue' };
  if (diff <= 2) return { label: `期限: ${date}`, tone: 'soon' };
  return { label: `期限: ${date}`, tone: 'normal' };
}

export function TaskCard({ task, onEdit, onDelete, onToggleComplete, onDragStart }: TaskCardProps) {
  const due = formatDueDate(task.dueDate);
  return (
    <article
      className={`task-card priority-${task.priority} ${task.status === 'done' ? 'is-done' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(task, e)}
      aria-label={`タスク: ${task.title}`}
    >
      <header className="task-card-head">
        <label className="task-check" title={task.status === 'done' ? '完了を解除' : '完了にする'}>
          <input
            type="checkbox"
            checked={task.status === 'done'}
            onChange={() => onToggleComplete(task)}
            aria-label="完了切り替え"
          />
        </label>
        <h3 className="task-title">{task.title}</h3>
        <span className={`badge badge-priority badge-${task.priority}`}>
          {PRIORITY_LABELS[task.priority]}
        </span>
      </header>

      {task.description && <p className="task-desc">{task.description}</p>}

      <div className={`task-meta tone-${due.tone}`}>
        <span className="task-due">{due.label}</span>
      </div>

      {task.tags.length > 0 && (
        <ul className="task-tags">
          {task.tags.map((t) => (
            <li key={t} className="tag-chip">
              #{t}
            </li>
          ))}
        </ul>
      )}

      <footer className="task-actions">
        <button type="button" className="btn-ghost-sm" onClick={() => onEdit(task)}>
          編集
        </button>
        <button type="button" className="btn-danger-sm" onClick={() => onDelete(task)}>
          削除
        </button>
      </footer>
    </article>
  );
}
