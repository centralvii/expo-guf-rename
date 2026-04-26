import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { Boxes, LayoutDashboard, FileArchive, FileText, Wrench, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

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
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: <LayoutDashboard size={18} />,
  },
];

const TOOLS_NAV: NavItem[] = [
  {
    id: 'guf-packer',
    label: 'GUF Packer',
    path: '/guf-packer',
    icon: <FileArchive size={18} />,
  },
  {
    id: 'task-helper',
    label: 'Task Helper',
    path: '/task-helper',
    icon: <FileText size={18} />,
  },
  {
    id: 'new-tool',
    label: 'Новый инструмент',
    path: '#',
    icon: <Wrench size={18} />,
    disabled: true,
    tag: 'СКОРО',
  },
];

export function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  // Auto-collapse on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const handler = (e: MediaQueryListEvent) => setIsCollapsed(e.matches);
    setIsCollapsed(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const sidebarClass = `sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`;

  const renderNavItem = (item: NavItem) => {
    if (item.disabled) {
      return (
        <div key={item.id} className="sidebar__link sidebar__link--disabled" title={item.label}>
          <span className="sidebar__link-icon">{item.icon}</span>
          {!isCollapsed && (
            <span className="sidebar__link-label">{item.label}</span>
          )}
          {!isCollapsed && item.tag && (
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
        {!isCollapsed && (
          <span className="sidebar__link-label">{item.label}</span>
        )}
      </NavLink>
    );
  };

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className={sidebarClass}>
        <div className="sidebar__header">
          <Link to="/" className="sidebar__logo">
            <div className="sidebar__logo-icon">
              <Boxes size={20} />
            </div>
            {!isCollapsed && (
              <span className="sidebar__logo-text">GD Helper</span>
            )}
          </Link>
        </div>

        <nav className="sidebar__nav">
          <div className="sidebar__section">
            {!isCollapsed && (
              <span className="sidebar__section-label">MAIN</span>
            )}
            {MAIN_NAV.map(renderNavItem)}
          </div>

          <div className="sidebar__section">
            {!isCollapsed && (
              <span className="sidebar__section-label">ИНСТРУМЕНТЫ</span>
            )}
            {TOOLS_NAV.map(renderNavItem)}
          </div>
        </nav>

        <div className="sidebar__footer">
          <button
            className="sidebar__toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
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
            <span className="statusbar__dot" />
            Ready
          </span>
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
