import { useState, useMemo, useRef, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Calendar, ChevronRight, FileText, AlertTriangle,
  X, Tag, Flame, ArrowUp, ArrowRight, ArrowDown, Circle,
  Clock, CheckCircle2, GitPullRequest, XCircle, Filter, SlidersHorizontal
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useTasks } from '../hooks/useTasks';
import type { TaskPriority, TaskStatus, TaskTag } from '../types';
import {
  TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TAG_COLOR_PRESETS
} from '../types';

/* ---- helpers ---- */
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин. назад`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн. назад`;
  return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

const PRIORITY_ICONS: Record<TaskPriority, React.ReactNode> = {
  critical: <Flame size={12} />,
  high: <ArrowUp size={12} />,
  medium: <ArrowRight size={12} />,
  low: <ArrowDown size={12} />,
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#3b82f6',
  low: '#6b7280',
};

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  open: <Circle size={12} />,
  in_progress: <Clock size={12} />,
  review: <GitPullRequest size={12} />,
  done: <CheckCircle2 size={12} />,
  closed: <XCircle size={12} />,
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  open: '#6b7280',
  in_progress: '#3b82f6',
  review: '#a855f7',
  done: '#22c55e',
  closed: '#374151',
};

/* ---- Tag picker subcomponent ---- */
interface TagPickerProps {
  selectedTags: TaskTag[];
  onChange: (tags: TaskTag[]) => void;
}

function TagPicker({ selectedTags, onChange }: TagPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLOR_PRESETS[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAdd = () => {
    if (!newTagName.trim()) return;
    const newTag: TaskTag = {
      id: crypto.randomUUID(),
      name: newTagName.trim(),
      color: newTagColor,
    };
    onChange([...selectedTags, newTag]);
    setNewTagName('');
    setNewTagColor(TAG_COLOR_PRESETS[0]);
    setIsOpen(false);
  };

  const handleRemove = (id: string) => {
    onChange(selectedTags.filter((t) => t.id !== id));
  };

  return (
    <div className="tag-picker" ref={ref}>
      <div className="tag-picker__selected">
        {selectedTags.map((tag) => (
          <span key={tag.id} className="task-tag" style={{ '--tag-color': tag.color } as React.CSSProperties}>
            {tag.name}
            <button type="button" onClick={() => handleRemove(tag.id)} className="task-tag__remove">
              <X size={10} />
            </button>
          </span>
        ))}
        <button type="button" className="tag-picker__add-btn" onClick={() => setIsOpen(!isOpen)}>
          <Tag size={12} /> Тег
        </button>
      </div>
      {isOpen && (
        <div className="tag-picker__dropdown">
          <div className="tag-picker__dropdown-inner">
            <input
              autoFocus
              type="text"
              className="tag-picker__input"
              placeholder="Название тега..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            />
            <div className="tag-picker__colors">
              {TAG_COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`tag-picker__color-dot ${newTagColor === color ? 'tag-picker__color-dot--active' : ''}`}
                  style={{ background: color }}
                  onClick={() => setNewTagColor(color)}
                />
              ))}
            </div>
            <button type="button" className="btn btn-primary btn--sm" onClick={handleAdd} disabled={!newTagName.trim()}>
              Добавить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Create Drawer ---- */
interface CreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, desc: string, priority: TaskPriority, status: TaskStatus, tags: TaskTag[]) => Promise<void>;
}

function CreateDrawer({ isOpen, onClose, onCreate }: CreateDrawerProps) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('open');
  const [tags, setTags] = useState<TaskTag[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setTitle('');
      setDesc('');
      setPriority('medium');
      setStatus('open');
      setTags([]);
    }, 260);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreate(title.trim(), desc.trim(), priority, status, tags);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className={`task-drawer-overlay ${isClosing ? 'task-drawer-overlay--closing' : ''}`} onClick={handleClose}>
      <div
        className={`task-drawer ${isClosing ? 'task-drawer--closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="task-drawer__header">
          <h2 className="task-drawer__title">Новая задача</h2>
          <button className="task-drawer__close" onClick={handleClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        <form className="task-drawer__body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Название <span className="form-required">*</span></label>
            <input
              ref={titleRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="TASK-1234 или произвольное название..."
              className="text-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Описание</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Краткое описание задачи..."
              className="text-input task-drawer__textarea"
              rows={3}
            />
          </div>

          <div className="task-drawer__row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Приоритет</label>
              <div className="select-group">
                {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`select-chip ${priority === p ? 'select-chip--active' : ''}`}
                    style={{ '--chip-color': PRIORITY_COLORS[p] } as React.CSSProperties}
                    onClick={() => setPriority(p)}
                  >
                    {PRIORITY_ICONS[p]}
                    {TASK_PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Статус</label>
            <div className="select-group">
              {(['open', 'in_progress', 'review', 'done', 'closed'] as TaskStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`select-chip ${status === s ? 'select-chip--active' : ''}`}
                  style={{ '--chip-color': STATUS_COLORS[s] } as React.CSSProperties}
                  onClick={() => setStatus(s)}
                >
                  {STATUS_ICONS[s]}
                  {TASK_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Теги</label>
            <TagPicker selectedTags={tags} onChange={setTags} />
          </div>

          <div className="task-drawer__footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? 'Создание...' : 'Создать задачу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---- Main page ---- */
export function TaskHelperPage() {
  const { tasks, isLoaded, error, addTask } = useTasks();
  const { notify } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterTag, setFilterTag] = useState<string>('all'); // tag name
  const [showFilters, setShowFilters] = useState(false);

  // Collect all unique tags across tasks
  const allTags = useMemo(() => {
    const tagMap = new Map<string, TaskTag>();
    tasks.forEach((task) => {
      task.tags?.forEach((tag) => {
        if (!tagMap.has(tag.name)) tagMap.set(tag.name, tag);
      });
    });
    return Array.from(tagMap.values());
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const q = searchQuery.toLowerCase();
        if (q && !task.title.toLowerCase().includes(q) && !task.description.toLowerCase().includes(q)) return false;
        if (filterStatus !== 'all' && task.status !== filterStatus) return false;
        if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
        if (filterTag !== 'all' && !task.tags?.some((t) => t.name === filterTag)) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [tasks, searchQuery, filterStatus, filterPriority, filterTag]);

  const hasActiveFilters = filterStatus !== 'all' || filterPriority !== 'all' || filterTag !== 'all';

  const handleCreate = async (
    title: string,
    desc: string,
    priority: TaskPriority,
    status: TaskStatus,
    tags: TaskTag[]
  ) => {
    try {
      await addTask(title, desc, { priority, status, tags });
      notify('Задача создана');
    } catch (createError) {
      console.error('[task-helper] Failed to create task', createError);
      notify('Не удалось создать задачу', 'error');
      throw createError;
    }
  };

  if (!isLoaded) {
    return (
      <div className="tool-page">
        <div className="app-restore">
          <div className="spinner" />
          <span>Загрузка...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tool-page anim-fade-in">
        <div className="tool-page__content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '32px', borderRadius: 'var(--radius-lg)', maxWidth: '400px' }}>
            <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
            <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>Ошибка подключения</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>{error}</p>
            <Link to="/settings" className="btn btn-primary">
              Перейти в настройки
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="tool-page anim-fade-in">
        <div className="tool-page__content">
          {/* Header bar */}
          <div className="task-registry__header">
            <div className="search-box" style={{ flex: 1, margin: 0 }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Поиск задач..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              className={`btn btn-secondary btn-icon ${showFilters ? 'btn-filter--active' : ''} ${hasActiveFilters ? 'btn-filter--has-active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              title="Фильтры"
            >
              <SlidersHorizontal size={16} />
              {hasActiveFilters && <span className="filter-dot" />}
            </button>
            <button className="btn btn-primary" onClick={() => setIsDrawerOpen(true)}>
              <Plus size={16} /> Создать
            </button>
          </div>

          {/* Filter bar */}
          {showFilters && (
            <div className="task-filters anim-fade-in">
              <div className="task-filters__group">
                <span className="task-filters__label"><Filter size={12} /> Статус</span>
                <div className="task-filters__chips">
                  <button
                    className={`filter-chip ${filterStatus === 'all' ? 'filter-chip--active' : ''}`}
                    onClick={() => setFilterStatus('all')}
                  >
                    Все
                  </button>
                  {(['open', 'in_progress', 'review', 'done', 'closed'] as TaskStatus[]).map((s) => (
                    <button
                      key={s}
                      className={`filter-chip ${filterStatus === s ? 'filter-chip--active' : ''}`}
                      style={{ '--chip-color': STATUS_COLORS[s] } as React.CSSProperties}
                      onClick={() => setFilterStatus(s)}
                    >
                      {STATUS_ICONS[s]}
                      {TASK_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="task-filters__group">
                <span className="task-filters__label"><Flame size={12} /> Приоритет</span>
                <div className="task-filters__chips">
                  <button
                    className={`filter-chip ${filterPriority === 'all' ? 'filter-chip--active' : ''}`}
                    onClick={() => setFilterPriority('all')}
                  >
                    Все
                  </button>
                  {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                    <button
                      key={p}
                      className={`filter-chip ${filterPriority === p ? 'filter-chip--active' : ''}`}
                      style={{ '--chip-color': PRIORITY_COLORS[p] } as React.CSSProperties}
                      onClick={() => setFilterPriority(p)}
                    >
                      {PRIORITY_ICONS[p]}
                      {TASK_PRIORITY_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              {allTags.length > 0 && (
                <div className="task-filters__group">
                  <span className="task-filters__label"><Tag size={12} /> Тег</span>
                  <div className="task-filters__chips">
                    <button
                      className={`filter-chip ${filterTag === 'all' ? 'filter-chip--active' : ''}`}
                      onClick={() => setFilterTag('all')}
                    >
                      Все
                    </button>
                    {allTags.map((tag) => (
                      <button
                        key={tag.name}
                        className={`filter-chip ${filterTag === tag.name ? 'filter-chip--active' : ''}`}
                        style={{ '--chip-color': tag.color } as React.CSSProperties}
                        onClick={() => setFilterTag(tag.name)}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasActiveFilters && (
                <button
                  className="task-filters__clear"
                  onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setFilterTag('all'); }}
                >
                  <X size={12} /> Сбросить фильтры
                </button>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="task-stats">
            <span className="task-stats__item">
              Всего: <strong>{tasks.length}</strong>
            </span>
            {filteredTasks.length !== tasks.length && (
              <span className="task-stats__item task-stats__item--filtered">
                Показано: <strong>{filteredTasks.length}</strong>
              </span>
            )}
            <span className="task-stats__item">
              В работе: <strong>{tasks.filter((t) => t.status === 'in_progress').length}</strong>
            </span>
          </div>

          {/* Task list */}
          <div className="task-list">
            {filteredTasks.length === 0 ? (
              <div className="task-list-empty">
                <FileText size={48} />
                <p>{searchQuery || hasActiveFilters ? 'Ничего не найдено' : 'Задач пока нет'}</p>
                {!searchQuery && !hasActiveFilters && (
                  <button className="btn btn-primary" onClick={() => setIsDrawerOpen(true)}>
                    <Plus size={16} /> Создать первую задачу
                  </button>
                )}
              </div>
            ) : (
              filteredTasks.map((task) => (
                <Link to={`/task-helper/${task.id}`} key={task.id} className="task-card">
                  <div className="task-card__content">
                    <div className="task-card__top">
                      {/* Priority badge */}
                      <span
                        className="task-badge task-badge--priority"
                        style={{ '--badge-color': PRIORITY_COLORS[task.priority ?? 'medium'] } as React.CSSProperties}
                      >
                        {PRIORITY_ICONS[task.priority ?? 'medium']}
                        {TASK_PRIORITY_LABELS[task.priority ?? 'medium']}
                      </span>
                      {/* Status badge */}
                      <span
                        className="task-badge task-badge--status"
                        style={{ '--badge-color': STATUS_COLORS[task.status ?? 'open'] } as React.CSSProperties}
                      >
                        {STATUS_ICONS[task.status ?? 'open']}
                        {TASK_STATUS_LABELS[task.status ?? 'open']}
                      </span>
                    </div>

                    <h3 className="task-card__title">{task.title}</h3>

                    {task.description && (
                      <p className="task-card__desc">{task.description}</p>
                    )}

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="task-card__tags">
                        {task.tags.map((tag) => (
                          <span key={tag.id} className="task-tag task-tag--sm" style={{ '--tag-color': tag.color } as React.CSSProperties}>
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="task-card__meta">
                      <span className="meta-item">
                        <Calendar size={12} />
                        {formatRelativeTime(task.updatedAt)}
                      </span>
                      {task.sections.length > 0 && (
                        <span className="meta-item">{task.sections.length} разд.</span>
                      )}
                    </div>
                  </div>
                  <div className="task-card__action">
                    <ChevronRight size={20} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <CreateDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}
