import { useState, useMemo, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Calendar, ChevronRight, FileText, AlertTriangle,
  X, Tag, Flame, ArrowUp, ArrowRight, ArrowDown, Circle,
  Clock, CheckCircle2, GitPullRequest, XCircle, Filter, SlidersHorizontal
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useTasks } from '../hooks/useTasks';
import { TaskTagPicker } from '../components/TaskTagPicker';
import type { TaskPriority, TaskStatus, TaskTag } from '../types';
import {
  TASK_PRIORITY_LABELS, TASK_STATUS_LABELS
} from '../types';

// --- UI-Kit Imports ---
import { Badge, Button, Drawer, IconButton, Input, Island, Loader, TagChip, Textarea, Toolbar } from '../ui';
import type { BadgeVariant } from '../ui';

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

const PRIORITY_BADGE_VARIANTS: Record<TaskPriority, BadgeVariant> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  open: <Circle size={12} />,
  in_progress: <Clock size={12} />,
  review: <GitPullRequest size={12} />,
  done: <CheckCircle2 size={12} />,
  closed: <XCircle size={12} />,
};

const STATUS_BADGE_VARIANTS: Record<TaskStatus, BadgeVariant> = {
  open: 'default',
  in_progress: 'accent',
  review: 'warning',
  done: 'success',
  closed: 'default',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  open: '#6b7280',
  in_progress: '#3b82f6',
  review: '#a855f7',
  done: '#22c55e',
  closed: '#374151',
};

/* ---- Create Drawer Implementation ---- */
interface CreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, desc: string, priority: TaskPriority, status: TaskStatus, tags: TaskTag[]) => Promise<void>;
}

function CreateTaskDrawer({ isOpen, onClose, onCreate }: CreateDrawerProps) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('open');
  const [tags, setTags] = useState<TaskTag[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreate(title.trim(), desc.trim(), priority, status, tags);
      setTitle('');
      setDesc('');
      setPriority('medium');
      setStatus('open');
      setTags([]);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Новая задача"
      footer={
        <>
          <Button size="sm" onClick={onClose} disabled={isSubmitting}>Отмена</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSubmitting} disabled={!title.trim()}>
            Создать задачу
          </Button>
        </>
      }
    >
      <form className="task-drawer__form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Input 
          label="Название"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="TASK-1234..."
          fullWidth
          autoFocus
        />

        <Textarea 
          label="Описание"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Краткое описание задачи..."
          fullWidth
        />

        <div className="form-group">
          <label className="ui-label">Приоритет</label>
          <div className="select-group" style={{ marginTop: '8px' }}>
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

        <div className="form-group">
          <label className="ui-label">Статус</label>
          <div className="select-group" style={{ marginTop: '8px' }}>
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
          <label className="ui-label">Теги</label>
          <div style={{ marginTop: '8px' }}>
            <TaskTagPicker selectedTags={tags} onChange={setTags} />
          </div>
        </div>
      </form>
    </Drawer>
  );
}

export function TaskHelperPage() {
  const { tasks, isLoaded, error, addTask } = useTasks();
  const { notify } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

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
      notify('Не удалось создать задачу', 'error');
      throw createError;
    }
  };

  if (!isLoaded) {
    return (
      <div className="tool-page">
        <div className="app-restore">
          <Loader size="lg" />
          <span style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Загрузка задач...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tool-page anim-fade-in">
        <div className="tool-page__content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', textAlign: 'center' }}>
          <Island flex={false} style={{ padding: '32px', maxWidth: '400px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
            <h3 style={{ marginBottom: '8px' }}>Ошибка подключения</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>{error}</p>
            <Button variant="primary" size="sm" onClick={() => window.location.href = '/settings'}>
              Перейти в настройки
            </Button>
          </Island>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="tool-page anim-fade-in">
        <div className="tool-page__content tool-page__content--auto">
          
          <Toolbar>
            <Toolbar.Left style={{ flex: 1 }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Поиск задач..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '38px' }}
                />
                {searchQuery && (
                  <IconButton
                    className="search-clear"
                    onClick={() => setSearchQuery('')}
                    icon={<X size={14} />}
                    label="Clear search"
                  />
                )}
              </div>
            </Toolbar.Left>
            <Toolbar.Right>
              <Button
                variant={showFilters ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                title="Фильтры"
                icon={<SlidersHorizontal size={16} />}
              >
                {hasActiveFilters && <span className="filter-dot" />}
                Фильтры
              </Button>
              <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={() => setIsDrawerOpen(true)}>
                Создать
              </Button>
            </Toolbar.Right>
          </Toolbar>

          {/* Filter bar */}
          {showFilters && (
            <Island flex={false} className="task-filters anim-fade-in" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="task-filters__group">
                  <span className="task-filters__label"><Filter size={12} /> Статус</span>
                  <div className="task-filters__chips">
                    <button className={`filter-chip ${filterStatus === 'all' ? 'filter-chip--active' : ''}`} onClick={() => setFilterStatus('all')}>Все</button>
                    {(['open', 'in_progress', 'review', 'done', 'closed'] as TaskStatus[]).map((s) => (
                      <button key={s} className={`filter-chip ${filterStatus === s ? 'filter-chip--active' : ''}`} onClick={() => setFilterStatus(s)}>
                        {STATUS_ICONS[s]} {TASK_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="task-filters__group">
                  <span className="task-filters__label"><Flame size={12} /> Приоритет</span>
                  <div className="task-filters__chips">
                    <button className={`filter-chip ${filterPriority === 'all' ? 'filter-chip--active' : ''}`} onClick={() => setFilterPriority('all')}>Все</button>
                    {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                      <button key={p} className={`filter-chip ${filterPriority === p ? 'filter-chip--active' : ''}`} onClick={() => setFilterPriority(p)}>
                        {PRIORITY_ICONS[p]} {TASK_PRIORITY_LABELS[p]}
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
                  <Button variant="ghost" size="sm" icon={<X size={12} />} onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setFilterTag('all'); }}>
                    Сбросить фильтры
                  </Button>
                )}
              </div>
            </Island>
          )}

          <div className="task-stats" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            <span className="task-stats__item">Всего: <strong>{tasks.length}</strong></span>
            <span className="task-stats__item" style={{ marginLeft: '16px' }}>В работе: <strong>{tasks.filter((t) => t.status === 'in_progress').length}</strong></span>
          </div>

          <div className="task-list custom-scrollbar">
            {filteredTasks.length === 0 ? (
              <div className="task-list-empty" style={{ padding: '60px 0' }}>
                <FileText size={48} opacity={0.2} />
                <p style={{ marginTop: '16px' }}>{searchQuery || hasActiveFilters ? 'Ничего не найдено' : 'Задач пока нет'}</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <Link to={`/task-helper/${task.id}`} key={task.id} className="task-card">
                  <div className="task-card__content">
                    <div className="task-card__top">
                      <Badge variant={PRIORITY_BADGE_VARIANTS[task.priority ?? 'medium']} dot>
                        {TASK_PRIORITY_LABELS[task.priority ?? 'medium']}
                      </Badge>
                      <Badge variant={STATUS_BADGE_VARIANTS[task.status ?? 'open']}>
                        {TASK_STATUS_LABELS[task.status ?? 'open']}
                      </Badge>
                    </div>

                    <h3 className="task-card__title">{task.title}</h3>
                    {task.description && <p className="task-card__desc">{task.description}</p>}
                    {task.tags && task.tags.length > 0 && (
                      <div className="task-card__tags">
                        {task.tags.map((tag) => (
                          <TagChip key={tag.id} color={tag.color} size="sm">
                            {tag.name}
                          </TagChip>
                        ))}
                      </div>
                    )}

                    <div className="task-card__meta">
                      <span className="meta-item"><Calendar size={12} /> {formatRelativeTime(task.updatedAt)}</span>
                      {task.sections.length > 0 && <span className="meta-item">{task.sections.length} разд.</span>}
                    </div>
                  </div>
                  <div className="task-card__action"><ChevronRight size={20} /></div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <CreateTaskDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}
