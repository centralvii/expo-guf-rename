import { Outlet, NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, FileArchive, FileText, Settings, PanelLeftDashed, Info, Workflow, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { refreshConnection, subscribeToConnection, type ConnectionState } from '../lib/connectionStatus';
import { IconButton } from '../ui';

declare const __APP_GIT_COMMIT__: string;

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  disabled?: boolean;
  tag?: string;
}

const MAIN_NAV: NavItem[] = [
  {
    id: 'about',
    label: 'О проекте',
    path: '/about',
    icon: <Info size={18} />,
  },
  {
    id: 'dashboard',
    label: 'Дашборд',
    path: '/',
    icon: <LayoutDashboard size={18} />,
  },
];

const TOOLS_NAV: NavItem[] = [
  {
    id: 'task-helper',
    label: 'Задачник',
    path: '/task-helper',
    icon: <FileText size={18} />,
  },
  {
    id: 'api-client',
    label: 'Запросник',
    path: '/api-client',
    icon: <Send size={18} />,
  },
  {
    id: 'guf-packer',
    label: 'Сборка GUF',
    path: '/guf-packer',
    icon: <FileArchive size={18} />,
  },
  {
    id: 'bpmn',
    label: 'Полигон BPMN',
    path: '/bpmn',
    icon: <Workflow size={18} />,
  },
];

const SIDEBAR_STORAGE_KEY = 'gd-helper-sidebar-collapsed';

export function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches) {
      return true;
    }
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  const [connectionState, setConnectionState] = useState<ConnectionState>('unknown');

  // Connection status: подписка на глобальный менеджер с exponential backoff
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;

    const unsubscribe = subscribeToConnection((snap) => {
      if (!cancelled) setConnectionState(snap.state);
    });

    const scheduleNext = (delay: number) => {
      if (cancelled) return;
      timeoutId = setTimeout(tick, delay);
    };

    const tick = async () => {
      if (cancelled) return;
      const snap = await refreshConnection(true);
      if (cancelled) return;
      if (snap.state === 'online') {
        failures = 0;
        scheduleNext(60_000); // 1 минута при стабильном соединении
      } else {
        failures = Math.min(failures + 1, 6);
        // 15s → 30s → 1m → 2m → 4m → 5m (cap)
        const delay = Math.min(15_000 * 2 ** (failures - 1), 300_000);
        scheduleNext(delay);
      }
    };

    // Первичная проверка сразу
    tick();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // Auto-collapse on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsCollapsed(true);
      } else {
        // Восстанавливаем из стораджа при возврате на большой экран
        const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
        setIsCollapsed(saved ? JSON.parse(saved) : false);
      }
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const sidebarClass = `sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`;

  const toggleSidebar = () => {
    setIsCollapsed((prev: boolean) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const renderNavItem = (item: NavItem) => {
    if (item.disabled) {
      return (
        <div key={item.id} className="sidebar__link sidebar__link--disabled" title={item.label}>
          <span className="sidebar__link-icon">{item.icon}</span>
          <span className="sidebar__link-label">{item.label}</span>
          {item.tag && (
            <span className="sidebar__link-tag">{item.tag}</span>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.id}
        to={item.path}
        end={item.path === '/'}
        className={({ isActive }) =>
          `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
        }
        title={item.label}
      >
        <span className="sidebar__link-icon">{item.icon}</span>
        <span className="sidebar__link-label">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className={sidebarClass}>
        <div className="sidebar__header">
          <Link to="/" className="sidebar__logo">
            <div className="sidebar__logo-icon" style={{ background: 'none', padding: 0 }}>
              <img src="/logo.svg" alt="Logo" style={{ width: '100%', height: '100%' }} />
            </div>
            <span className="sidebar__logo-text">GreenData Helper</span>
          </Link>
        </div>

        <nav className="sidebar__nav">
          <div className="sidebar__section">
            {MAIN_NAV.map(renderNavItem)}
          </div>

          <div className="sidebar__divider" />

          <div className="sidebar__section">
            {TOOLS_NAV.map(renderNavItem)}
          </div>

          <div className="sidebar__divider" />

          <div className="sidebar__section">
            {renderNavItem({
              id: 'settings',
              label: 'Настройки',
              path: '/settings',
              icon: <Settings size={18} />,
            })}
          </div>
        </nav>

        <div className="sidebar__footer">
          <IconButton
            className="sidebar__toggle"
            onClick={toggleSidebar}
            icon={<PanelLeftDashed size={16} />}
            label={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          />
        </div>
      </aside>

      {/* Main content area */}
      <div className="dashboard__main">
        <main className="dashboard__content">
          <Outlet />
        </main>
      </div>

      {/* Status bar — full width under sidebar + content */}
      <footer className="statusbar">
        <div className="statusbar__left">
          <span className="statusbar__item">
            <span className={`statusbar__dot statusbar__dot--${connectionState}`} />
            {connectionState === 'online' && 'Online'}
            {connectionState === 'offline' && 'Offline'}
            {connectionState === 'unknown' && 'Проверка...'}
          </span>
        </div>
        <div className="statusbar__center">
          <span className="statusbar__item statusbar__copy">
            Сделано с ❤️ для ускорения разработки
          </span>
          <span className="statusbar__divider" />
          <a
            href="https://github.com/centralvii/expo-guf-rename"
            target="_blank"
            rel="noopener noreferrer"
            className="statusbar__item statusbar__link"
          >
            GitHub
          </a>
        </div>
        <div className="statusbar__right">
          <span className="statusbar__item">
            commit: {__APP_GIT_COMMIT__}
          </span>
        </div>
      </footer>
    </div>
  );
}
