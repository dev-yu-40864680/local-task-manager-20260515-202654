import type { TaskPriority } from '../types';
import { PRIORITY_LABELS, PRIORITY_ORDER } from '../types';

export type DueFilter = 'all' | 'overdue' | 'today' | 'week' | 'none';

export interface FilterState {
  query: string;
  priority: TaskPriority | 'all';
  tag: string;
  due: DueFilter;
}

interface FilterBarProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  allTags: string[];
  onReset: () => void;
}

export function FilterBar({ value, onChange, allTags, onReset }: FilterBarProps) {
  const update = <K extends keyof FilterState>(key: K, v: FilterState[K]) => {
    onChange({ ...value, [key]: v });
  };

  const hasFilter =
    value.query !== '' || value.priority !== 'all' || value.tag !== '' || value.due !== 'all';

  return (
    <div className="filter-bar">
      <input
        type="search"
        placeholder="検索（タイトル / 説明 / タグ）"
        value={value.query}
        onChange={(e) => update('query', e.target.value)}
        className="filter-input"
        aria-label="検索"
      />
      <select
        value={value.priority}
        onChange={(e) => update('priority', e.target.value as FilterState['priority'])}
        aria-label="優先度フィルタ"
      >
        <option value="all">優先度: すべて</option>
        {PRIORITY_ORDER.map((p) => (
          <option key={p} value={p}>
            優先度: {PRIORITY_LABELS[p]}
          </option>
        ))}
      </select>
      <select
        value={value.tag}
        onChange={(e) => update('tag', e.target.value)}
        aria-label="タグフィルタ"
      >
        <option value="">タグ: すべて</option>
        {allTags.map((t) => (
          <option key={t} value={t}>
            タグ: {t}
          </option>
        ))}
      </select>
      <select
        value={value.due}
        onChange={(e) => update('due', e.target.value as DueFilter)}
        aria-label="期限フィルタ"
      >
        <option value="all">期限: すべて</option>
        <option value="overdue">期限: 期限切れ</option>
        <option value="today">期限: 今日</option>
        <option value="week">期限: 今週中</option>
        <option value="none">期限: 未設定</option>
      </select>
      <button
        type="button"
        className="btn-ghost"
        onClick={onReset}
        disabled={!hasFilter}
        aria-label="フィルタをリセット"
      >
        リセット
      </button>
    </div>
  );
}
