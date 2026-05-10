import { type ReactNode, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileArchive, FileText, ArrowRight, Clock,
  Flame, ArrowUp, ArrowDown, Circle, CheckCircle2, XCircle,
  GitPullRequest, TrendingUp, BarChart3, Zap, Sparkles, FileSearch, Workflow
} from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import type { TaskItem, TaskPriority, TaskStatus } from '../types';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '../types';

/* ---- Tool data ---- */

interface ToolCard {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  path: string;
  tag: string;
  tagColor: string;
  accentColor: string;
  disabled?: boolean;
}

const TOOLS: ToolCard[] = [
  {
    id: 'guf-packer',
    title: 'Сборка GUF',
    description: 'Пакетное переименование файлов .guf из ZIP-архива с шаблонами и drag-and-drop.',
    icon: <FileArchive size={22} />,
    path: '/guf-packer',
    tag: 'ГОТОВО',
    tagColor: 'green',
    accentColor: '#0070f3',
  },
  {
    id: 'task-helper',
    title: 'Задачник',
    description: 'Реестр задач с приоритетами, статусами, Markdown и синхронизацией.',
    icon: <FileText size={22} />,
    path: '/task-helper',
    tag: 'ГОТОВО',
    tagColor: 'green',
    accentColor: '#7928ca',
  },
  {
    id: 'bpmn',
    title: 'BPMN',
    description: 'Визуальный редактор бизнес-процессов на базе BPMN 2.0.',
    icon: <Workflow size={22} />,
    path: '/bpmn',
    tag: 'ГОТОВО',
    tagColor: 'green',
    accentColor: '#22c55e',
  },
  {
    id: 'pdf-viewer',
    title: 'PDF Просмотр',
    description: 'Инструмент для загрузки PDF и создания заметок с привязкой к тексту.',
    icon: <FileSearch size={22} />,
    path: '/pdf-viewer',
    tag: 'НОВОЕ',
    tagColor: 'blue',
    accentColor: '#ff0080',
  },
];

/* ---- Constants ---- */

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#3b82f6',
  low: '#6b7280',
};

const PRIORITY_ICONS: Record<TaskPriority, ReactNode> = {
  critical: <Flame size={12} />,
  high: <ArrowUp size={12} />,
  medium: <ArrowRight size={12} />,
  low: <ArrowDown size={12} />,
};

const STATUS_ICONS: Record<TaskStatus, ReactNode> = {
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

/* ---- Helpers ---- */

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} д. назад`;
  return new Date(timestamp).toLocaleDateString('ru-RU');
}

function computeStats(tasks: TaskItem[]) {
  const total = tasks.length;
  const byStatus: Record<TaskStatus, number> = {
    open: 0, in_progress: 0, review: 0, done: 0, closed: 0,
  };
  const byPriority: Record<TaskPriority, number> = {
    critical: 0, high: 0, medium: 0, low: 0,
  };

  for (const t of tasks) {
    byStatus[t.status]++;
    byPriority[t.priority]++;
  }

  const active = byStatus.open + byStatus.in_progress + byStatus.review;
  const completed = byStatus.done + byStatus.closed;

  return { total, byStatus, byPriority, active, completed };
}

/* ---- Skeleton sub-components ---- */

// Each card shows EITHER the skeleton OR the real content — no overlap, no layout shift.

function SkStatCards({ loaded, stats }: { loaded: boolean; stats: ReturnType<typeof computeStats> }) {
  const cards = [
    { iconClass: 'dash-stat-card__icon--blue', icon: <BarChart3 size={18} />, value: stats.total, label: 'Всего задач' },
    { iconClass: 'dash-stat-card__icon--amber', icon: <Zap size={18} />, value: stats.active, label: 'В работе' },
    { iconClass: 'dash-stat-card__icon--green', icon: <CheckCircle2 size={18} />, value: stats.completed, label: 'Завершено' },
    { iconClass: 'dash-stat-card__icon--red', icon: <Flame size={18} />, value: stats.byPriority.critical + stats.byPriority.high, label: 'Срочных' },
  ];

  return (
    <section className="dash-stats-row">
      {cards.map((c, i) => (
        <div key={i} className="dash-stat-card">
          {!loaded ? (
            /* Skeleton state — same layout as real card */
            <>
              <div className="sk sk-stat-icon" />
              <div className="dash-stat-card__info">
                <div className="sk sk-stat-value" />
                <div className="sk sk-stat-label" />
              </div>
            </>
          ) : (
            /* Real state — fades in via .sk-reveal animation */
            <>
              <div className={`dash-stat-card__icon ${c.iconClass} sk-reveal`}>
                {c.icon}
              </div>
              <div className="dash-stat-card__info sk-reveal">
                <div className="dash-stat-card__value">{c.value}</div>
                <div className="dash-stat-card__label">{c.label}</div>
              </div>
            </>
          )}
        </div>
      ))}
    </section>
  );
}

function SkSidebarWidgets({
  loaded, stats, urgentTasks,
}: {
  loaded: boolean;
  stats: ReturnType<typeof computeStats>;
  urgentTasks: TaskItem[];
}) {
  return (
    <aside className="dash-sidebar-widgets">

      {/* Status Distribution */}
      <div className="dash-widget">
        <div className="dash-widget__header">
          <TrendingUp size={14} />
          <span>Статусы задач</span>
        </div>
        <div className="dash-widget__bars">
          {(['open', 'in_progress', 'review', 'done', 'closed'] as TaskStatus[]).map((s) => {
            const count = stats.byStatus[s];
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={s} className="dash-bar-row">
                {!loaded ? (
                  <>
                    <div className="sk sk-bar-label" />
                    <div className="sk sk-bar-track" />
                    <div className="sk sk-bar-count" />
                  </>
                ) : (
                  <>
                    <div className="dash-bar-row__label sk-reveal">
                      <span className="dash-bar-row__icon" style={{ color: STATUS_COLORS[s] }}>{STATUS_ICONS[s]}</span>
                      <span>{TASK_STATUS_LABELS[s]}</span>
                    </div>
                    <div className="dash-bar-row__track sk-reveal">
                      <div
                        className="dash-bar-row__fill"
                        style={{ width: `${pct}%`, background: STATUS_COLORS[s] }}
                      />
                    </div>
                    <span className="dash-bar-row__count sk-reveal">{count}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Urgent tasks */}
      <div className="dash-widget">
        <div className="dash-widget__header">
          <Flame size={14} />
          <span>Требуют внимания</span>
        </div>
        <div className="dash-widget__list">
          {!loaded ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="dash-urgent-item" style={{ pointerEvents: 'none' }}>
                <div className="sk sk-urgent-dot" />
                <div className="sk sk-urgent-title" />
                <div className="sk sk-urgent-badge" />
              </div>
            ))
          ) : (
            <div className="sk-reveal">
              {urgentTasks.length > 0
                ? urgentTasks.map((t) => (
                  <Link to={`/task-helper/${t.id}`} key={t.id} className="dash-urgent-item">
                    <span className="dash-urgent-item__dot" style={{ background: PRIORITY_COLORS[t.priority] }} />
                    <span className="dash-urgent-item__title">{t.title}</span>
                    <span className="dash-urgent-item__badge" style={{ color: PRIORITY_COLORS[t.priority] }}>
                      {PRIORITY_ICONS[t.priority]}
                    </span>
                  </Link>
                ))
                : (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 10px' }}>
                    Срочных задач нет 🎉
                  </p>
                )
              }
            </div>
          )}
        </div>
      </div>

      {/* Priority breakdown */}
      <div className="dash-widget">
        <div className="dash-widget__header">
          <Sparkles size={14} />
          <span>Приоритеты</span>
        </div>
        <div className="dash-widget__priority-grid">
          {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
            <div key={p} className="dash-priority-cell">
              {!loaded ? (
                <>
                  <div className="sk sk-priority-icon" />
                  <div className="sk sk-priority-count" />
                  <div className="sk sk-priority-label" />
                </>
              ) : (
                <>
                  <span className="dash-priority-cell__icon sk-reveal" style={{ color: PRIORITY_COLORS[p] }}>
                    {PRIORITY_ICONS[p]}
                  </span>
                  <span className="dash-priority-cell__count sk-reveal">
                    {stats.byPriority[p]}
                  </span>
                  <span className="dash-priority-cell__label sk-reveal">
                    {TASK_PRIORITY_LABELS[p]}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function SkRecentActivity({ loaded, recentTasks }: { loaded: boolean; recentTasks: TaskItem[] }) {
  const skeletonRows = [0, 1, 2, 3, 4];
  return (
    <section className="dashboard-section">
      <div className="dashboard-section__header">
        <h3 className="dashboard-section__title">Недавняя активность</h3>
        {loaded && (
          <Link to="/task-helper" className="dash-view-all sk-reveal">
            Все задачи <ArrowRight size={14} />
          </Link>
        )}
      </div>
      <div className="dash-recent-list">
        {!loaded ? (
          skeletonRows.map((i) => (
            <div key={i} className="sk-recent-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                <div className="sk sk-recent-status" />
                <div className="sk-recent-info">
                  <div className="sk sk-recent-title" style={{ width: `${45 + (i % 3) * 15}%` }} />
                  <div className="sk sk-recent-desc" style={{ width: `${25 + (i % 4) * 8}%` }} />
                </div>
              </div>
              <div className="sk-recent-right">
                <div className="sk sk-recent-priority" />
                <div className="sk sk-recent-time" />
              </div>
            </div>
          ))
        ) : (
          recentTasks.map((task) => (
            <Link to={`/task-helper/${task.id}`} key={task.id} className="dash-recent-item sk-reveal">
              <div className="dash-recent-item__left">
                <span className="dash-recent-item__status" style={{ color: STATUS_COLORS[task.status] }}>
                  {STATUS_ICONS[task.status]}
                </span>
                <div className="dash-recent-item__info">
                  <span className="dash-recent-item__title">{task.title}</span>
                  {task.description && (
                    <span className="dash-recent-item__desc">{task.description}</span>
                  )}
                </div>
              </div>
              <div className="dash-recent-item__right">
                <span className="dash-recent-item__priority" style={{ color: PRIORITY_COLORS[task.priority] }}>
                  {PRIORITY_ICONS[task.priority]}
                  {TASK_PRIORITY_LABELS[task.priority]}
                </span>
                <span className="dash-recent-item__time">{timeAgo(task.updatedAt)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

export function HomePage() {
  const { tasks, isLoaded } = useTasks();

  const stats = useMemo(() => computeStats(tasks), [tasks]);

  const recentTasks = useMemo(() =>
    [...tasks].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    [tasks],
  );

  const urgentTasks = useMemo(() =>
    tasks
      .filter((t) => (t.priority === 'critical' || t.priority === 'high') && t.status !== 'done' && t.status !== 'closed')
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3),
    [tasks],
  );

  return (
    <div className="home-dashboard anim-fade-in">
      {/* ===== Quick Stats — skeleton while loading ===== */}
      <SkStatCards loaded={isLoaded} stats={stats} />

      {/* ===== Main Grid: Tools + Sidebar ===== */}
      <div className="dash-main-grid">

        {/* Left: Tools */}
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h3 className="dashboard-section__title">Инструменты</h3>
            <span className="dashboard-section__count">{TOOLS.length} шт.</span>
          </div>
          <div className="dashboard-grid">
            {TOOLS.map((tool) => (
              <Link
                to={tool.disabled ? "#" : tool.path}
                key={tool.id}
                className={`dash-card ${tool.disabled ? 'dash-card--disabled' : ''}`}
                onClick={(e) => tool.disabled && e.preventDefault()}
              >
                <div className="dash-card__header">
                  <div className={`dash-card__icon ${tool.disabled ? 'dash-card__icon--muted' : ''}`}>
                    {tool.icon}
                  </div>
                  <span className={`dash-card__tag dash-card__tag--${tool.tagColor}`}>
                    {tool.tag}
                  </span>
                </div>
                <h3 className={`dash-card__title ${tool.disabled ? 'dash-card__title--muted' : ''}`}>
                  {tool.title}
                </h3>
                <p className="dash-card__desc">{tool.description}</p>
                <div className="dash-card__footer">
                  <span className="dash-card__link">
                    {tool.disabled ? 'В разработке' : (
                      <>Открыть <ArrowRight size={14} /></>
                    )}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Right: Sidebar widgets — skeleton while loading */}
        <SkSidebarWidgets loaded={isLoaded} stats={stats} urgentTasks={urgentTasks} />
      </div>

      {/* ===== Recent Activity — skeleton while loading ===== */}
      <SkRecentActivity loaded={isLoaded} recentTasks={recentTasks} />

    </div>
  );
}
