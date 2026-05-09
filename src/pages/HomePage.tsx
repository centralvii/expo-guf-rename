import { type ReactNode, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileArchive, FileText, GitBranch, ArrowRight, Activity, Clock,
  Flame, ArrowUp, ArrowDown, Circle, CheckCircle2, XCircle,
  GitPullRequest, TrendingUp, BarChart3, Zap, Sparkles
} from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import type { TaskItem, TaskPriority, TaskStatus } from '../types';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '../types';

/* ---- Typewriter ---- */

const TYPEWRITER_WORDS = [
  'Переименовывай.',
  'Упаковывай.',
  'Документируй.',
  'Автоматизируй.',
  'Создавай.',
];

function useTypewriter(words: string[], typingSpeed = 90, deletingSpeed = 50, pauseMs = 1800) {
  const [text, setText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const tick = useCallback(() => {
    const currentWord = words[wordIndex];

    if (!isDeleting) {
      const next = currentWord.slice(0, text.length + 1);
      setText(next);
      if (next === currentWord) {
        timerRef.current = setTimeout(() => setIsDeleting(true), pauseMs);
        return;
      }
    } else {
      const next = currentWord.slice(0, text.length - 1);
      setText(next);
      if (next === '') {
        setIsDeleting(false);
        setWordIndex((i) => (i + 1) % words.length);
      }
    }
  }, [words, wordIndex, text, isDeleting, pauseMs]);

  useEffect(() => {
    const speed = isDeleting ? deletingSpeed : typingSpeed;
    timerRef.current = setTimeout(tick, speed);
    return () => clearTimeout(timerRef.current);
  }, [tick, isDeleting, typingSpeed, deletingSpeed]);

  return text;
}

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
    icon: <GitBranch size={22} />,
    path: '/bpmn',
    tag: 'НОВОЕ',
    tagColor: 'blue',
    accentColor: '#22c55e',
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

/* ---- Component ---- */

export function HomePage() {
  const typedText = useTypewriter(TYPEWRITER_WORDS);
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

      {/* ===== Welcome Banner ===== */}
      <section className="welcome-banner">
        <div className="welcome-banner__content">
          <div className="welcome-banner__icon" style={{ background: 'none', border: 'none' }}>
            <img src="/logo.svg" alt="Logo" style={{ width: '64px', height: '64px' }} />
          </div>
          <div className="welcome-banner__text">
            <h2 className="welcome-banner__title">
              Добро пожаловать в <span className="welcome-banner__highlight">GD Helper</span>
            </h2>
            <div className="typewriter">
              <span className="typewriter__text">{typedText}</span>
              <span className="typewriter__cursor">|</span>
            </div>
            <p className="welcome-banner__subtitle">
              Инструменты для работы с проектами GreenData. Выберите нужный инструмент.
            </p>
          </div>
        </div>
        <div className="welcome-banner__meta">
          <div className="welcome-banner__stat">
            <Activity size={14} />
            <span>{TOOLS.filter(t => !t.disabled).length} активных</span>
          </div>
          <div className="welcome-banner__stat">
            <Clock size={14} />
            <span>{new Date().toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
      </section>

      {/* ===== Quick Stats ===== */}
      {isLoaded && tasks.length > 0 && (
        <section className="dash-stats-row">
          <div className="dash-stat-card">
            <div className="dash-stat-card__icon dash-stat-card__icon--blue">
              <BarChart3 size={18} />
            </div>
            <div className="dash-stat-card__info">
              <div className="dash-stat-card__value">{stats.total}</div>
              <div className="dash-stat-card__label">Всего задач</div>
            </div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-card__icon dash-stat-card__icon--amber">
              <Zap size={18} />
            </div>
            <div className="dash-stat-card__info">
              <div className="dash-stat-card__value">{stats.active}</div>
              <div className="dash-stat-card__label">В работе</div>
            </div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-card__icon dash-stat-card__icon--green">
              <CheckCircle2 size={18} />
            </div>
            <div className="dash-stat-card__info">
              <div className="dash-stat-card__value">{stats.completed}</div>
              <div className="dash-stat-card__label">Завершено</div>
            </div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-card__icon dash-stat-card__icon--red">
              <Flame size={18} />
            </div>
            <div className="dash-stat-card__info">
              <div className="dash-stat-card__value">{stats.byPriority.critical + stats.byPriority.high}</div>
              <div className="dash-stat-card__label">Срочных</div>
            </div>
          </div>
        </section>
      )}

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

        {/* Right: Sidebar widgets */}
        {isLoaded && tasks.length > 0 && (
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
                      <div className="dash-bar-row__label">
                        <span className="dash-bar-row__icon" style={{ color: STATUS_COLORS[s] }}>{STATUS_ICONS[s]}</span>
                        <span>{TASK_STATUS_LABELS[s]}</span>
                      </div>
                      <div className="dash-bar-row__track">
                        <div
                          className="dash-bar-row__fill"
                          style={{ width: `${pct}%`, background: STATUS_COLORS[s] }}
                        />
                      </div>
                      <span className="dash-bar-row__count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Urgent tasks */}
            {urgentTasks.length > 0 && (
              <div className="dash-widget">
                <div className="dash-widget__header">
                  <Flame size={14} />
                  <span>Требуют внимания</span>
                </div>
                <div className="dash-widget__list">
                  {urgentTasks.map((t) => (
                    <Link to={`/task-helper/${t.id}`} key={t.id} className="dash-urgent-item">
                      <span
                        className="dash-urgent-item__dot"
                        style={{ background: PRIORITY_COLORS[t.priority] }}
                      />
                      <span className="dash-urgent-item__title">{t.title}</span>
                      <span
                        className="dash-urgent-item__badge"
                        style={{ color: PRIORITY_COLORS[t.priority] }}
                      >
                        {PRIORITY_ICONS[t.priority]}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Priority breakdown */}
            <div className="dash-widget">
              <div className="dash-widget__header">
                <Sparkles size={14} />
                <span>Приоритеты</span>
              </div>
              <div className="dash-widget__priority-grid">
                {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                  <div key={p} className="dash-priority-cell">
                    <span className="dash-priority-cell__icon" style={{ color: PRIORITY_COLORS[p] }}>
                      {PRIORITY_ICONS[p]}
                    </span>
                    <span className="dash-priority-cell__count">{stats.byPriority[p]}</span>
                    <span className="dash-priority-cell__label">{TASK_PRIORITY_LABELS[p]}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ===== Recent Activity ===== */}
      {isLoaded && recentTasks.length > 0 && (
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h3 className="dashboard-section__title">Недавняя активность</h3>
            <Link to="/task-helper" className="dash-view-all">
              Все задачи <ArrowRight size={14} />
            </Link>
          </div>
          <div className="dash-recent-list">
            {recentTasks.map((task) => (
              <Link to={`/task-helper/${task.id}`} key={task.id} className="dash-recent-item">
                <div className="dash-recent-item__left">
                  <span
                    className="dash-recent-item__status"
                    style={{ color: STATUS_COLORS[task.status] }}
                  >
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
                  <span
                    className="dash-recent-item__priority"
                    style={{ color: PRIORITY_COLORS[task.priority] }}
                  >
                    {PRIORITY_ICONS[task.priority]}
                    {TASK_PRIORITY_LABELS[task.priority]}
                  </span>
                  <span className="dash-recent-item__time">{timeAgo(task.updatedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
