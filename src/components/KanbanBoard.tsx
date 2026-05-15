import { useState } from 'react';
import { TaskCard } from './TaskCard';
import type { Task, TaskStatus } from '../types';
import { STATUS_LABELS, STATUS_ORDER } from '../types';

interface KanbanBoardProps {
  tasksByStatus: Record<TaskStatus, Task[]>;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onMove: (taskId: string, status: TaskStatus) => void;
}

export function KanbanBoard({
  tasksByStatus,
  onEdit,
  onDelete,
  onToggleComplete,
  onMove
}: KanbanBoardProps) {
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const handleDragStart = (task: Task, e: React.DragEvent<HTMLElement>) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (status: TaskStatus, e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setDragOver(null);
    if (id) onMove(id, status);
  };

  return (
    <div className="kanban">
      {STATUS_ORDER.map((status) => {
        const list = tasksByStatus[status];
        return (
          <section
            key={status}
            className={`column status-${status} ${dragOver === status ? 'is-drag-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(status);
            }}
            onDragLeave={() => setDragOver((v) => (v === status ? null : v))}
            onDrop={(e) => handleDrop(status, e)}
          >
            <header className="column-head">
              <h2>{STATUS_LABELS[status]}</h2>
              <span className="column-count" aria-label="件数">
                {list.length}
              </span>
            </header>
            <div className="column-body">
              {list.length === 0 ? (
                <p className="column-empty">タスクなし</p>
              ) : (
                list.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleComplete={onToggleComplete}
                    onDragStart={handleDragStart}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
