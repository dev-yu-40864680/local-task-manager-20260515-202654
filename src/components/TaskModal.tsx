import { useEffect, useMemo, useState } from 'react';
import type { DraftTask } from '../hooks/useTasks';
import type { Task, TaskPriority, TaskStatus } from '../types';
import { PRIORITY_LABELS, PRIORITY_ORDER, STATUS_LABELS, STATUS_ORDER } from '../types';

interface TaskModalProps {
  open: boolean;
  initialTask: Task | null;
  knownTags: string[];
  onClose: () => void;
  onSubmit: (draft: DraftTask, id: string | null) => void;
}

function emptyDraft(): DraftTask {
  return {
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    dueDate: null,
    tags: []
  };
}

export function TaskModal({ open, initialTask, knownTags, onClose, onSubmit }: TaskModalProps) {
  const [draft, setDraft] = useState<DraftTask>(emptyDraft());
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initialTask) {
      setDraft({
        title: initialTask.title,
        description: initialTask.description,
        priority: initialTask.priority,
        status: initialTask.status,
        dueDate: initialTask.dueDate,
        tags: [...initialTask.tags]
      });
    } else {
      setDraft(emptyDraft());
    }
    setTagInput('');
    setError(null);
  }, [open, initialTask]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const suggestions = useMemo(
    () => knownTags.filter((t) => !draft.tags.includes(t)),
    [knownTags, draft.tags]
  );

  if (!open) return null;

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#+/, '');
    if (!tag) return;
    if (draft.tags.includes(tag)) return;
    setDraft({ ...draft, tags: [...draft.tags, tag] });
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setDraft({ ...draft, tags: draft.tags.filter((t) => t !== tag) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      setError('タイトルを入力してください');
      return;
    }
    onSubmit(
      {
        ...draft,
        title,
        description: draft.description.trim(),
        dueDate: draft.dueDate || null
      },
      initialTask ? initialTask.id : null
    );
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <header className="modal-head">
          <h2>{initialTask ? 'タスクを編集' : '新しいタスク'}</h2>
          <button type="button" className="btn-ghost-sm" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </header>

        <label className="field">
          <span className="field-label">タイトル *</span>
          <input
            type="text"
            value={draft.title}
            maxLength={120}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            autoFocus
            required
          />
        </label>

        <label className="field">
          <span className="field-label">説明</span>
          <textarea
            value={draft.description}
            rows={4}
            maxLength={2000}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field-label">優先度</span>
            <select
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value as TaskPriority })}
            >
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">状態</span>
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">期限</span>
            <input
              type="date"
              value={draft.dueDate ?? ''}
              onChange={(e) => setDraft({ ...draft, dueDate: e.target.value || null })}
            />
          </label>
        </div>

        <div className="field">
          <span className="field-label">タグ</span>
          <div className="tag-editor">
            {draft.tags.map((t) => (
              <span key={t} className="tag-chip removable">
                #{t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  aria-label={`タグ ${t} を削除`}
                  className="tag-remove"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(tagInput);
                } else if (e.key === 'Backspace' && tagInput === '' && draft.tags.length > 0) {
                  removeTag(draft.tags[draft.tags.length - 1]);
                }
              }}
              placeholder="Enter で追加"
              className="tag-input"
            />
          </div>
          {suggestions.length > 0 && (
            <div className="tag-suggestions">
              <span className="tag-suggestion-label">候補:</span>
              {suggestions.slice(0, 8).map((t) => (
                <button
                  type="button"
                  key={t}
                  className="tag-suggestion"
                  onClick={() => addTag(t)}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}

        <footer className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className="btn-primary">
            {initialTask ? '保存' : '追加'}
          </button>
        </footer>
      </form>
    </div>
  );
}
