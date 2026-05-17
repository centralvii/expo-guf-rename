import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileArchive, FileText, Settings, PanelLeftDashed, Info, Workflow, Send, Database, ChevronRight, Layers, Puzzle, Sparkles, Bookmark } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { refreshConnection, subscribeToConnection, type ConnectionState } from '../lib/connectionStatus';
import { IconButton } from '../ui';
import { BookmarkDrawer } from './BookmarkDrawer';

declare const __APP_GIT_COMMIT__: string;

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  external?: boolean;
  disabled?: boolean;
  tag?: string;
}

interface NavFolder {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

function renderServiceLogo(src: string, label: string) {
  return (
    <span
      className="sidebar__service-logo"
      style={{ '--service-logo': `url(${src})` } as React.CSSProperties}
      aria-hidden="true"
      title={label}
    />
  );
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

const FOLDERS: NavFolder[] = [
  {
    id: 'main',
    label: 'Основное',
    icon: <Layers size={18} />,
    items: [
      { id: 'task-helper', label: 'Задачник', path: '/task-helper', icon: <FileText size={18} /> },
      { id: 'guf-packer', label: 'Сборка GUF', path: '/guf-packer', icon: <FileArchive size={18} /> },
    ],
  },
  {
    id: 'additional',
    label: 'Дополнительное',
    icon: <Puzzle size={18} />,
    items: [
      { id: 'api-client', label: 'Запросник', path: '/api-client', icon: <Send size={18} /> },
      { id: 'bpmn', label: 'Полигон BPMN', path: '/bpmn', icon: <Workflow size={18} /> },
      { id: 'sql-inspector', label: 'Инспектор SQL', path: '/sql-inspector', icon: <Database size={18} /> },
    ],
  },
];

const AI_SERVICES_FOLDER: NavFolder = {
  id: 'ai-services',
  label: 'ИИ Сервисы',
  icon: <Sparkles size={18} />,
  items: [
    { id: 'chatgpt', label: 'ChatGPT', path: 'https://chatgpt.com', external: true, icon: renderServiceLogo('/ai-services/chatgpt.svg', 'ChatGPT') },
    { id: 'deepseek', label: 'DeepSeek', path: 'https://chat.deepseek.com', external: true, icon: renderServiceLogo('/ai-services/deepseek.svg', 'DeepSeek') },
    { id: 'gemini', label: 'Gemini', path: 'https://gemini.google.com', external: true, icon: renderServiceLogo('/ai-services/gemini.svg', 'Gemini') },
    { id: 'claude', label: 'Claude', path: 'https://claude.ai', external: true, icon: renderServiceLogo('/ai-services/claude.svg', 'Claude') },
    { id: 'qwen', label: 'Qwen', path: 'https://chat.qwen.ai', external: true, icon: renderServiceLogo('/ai-services/qwen.svg', 'Qwen') },
    { id: 'grok', label: 'Grok', path: 'https://grok.com', external: true, icon: renderServiceLogo('/ai-services/grok.svg', 'Grok') },
    { id: 'perplexity', label: 'Perplexity', path: 'https://www.perplexity.ai', external: true, icon: renderServiceLogo('/ai-services/perplexity.svg', 'Perplexity') },
  ],
};

const ALL_FOLDERS: NavFolder[] = [...FOLDERS, AI_SERVICES_FOLDER];

const SIDEBAR_STORAGE_KEY = 'gd-helper-sidebar-collapsed';

export function Layout() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches) {
      return true;
    }
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  const [connectionState, setConnectionState] = useState<ConnectionState>('unknown');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const folderRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Connection status: подписка на глобальный менеджер с exponential backoff
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;
    let isPaused = false;

    const unsubscribe = subscribeToConnection((snap) => {
      if (!cancelled) setConnectionState(snap.state);
    });

    const scheduleNext = (delay: number) => {
      if (cancelled || isPaused) return;
      timeoutId = setTimeout(tick, delay);
    };

    const tick = async () => {
      if (cancelled || isPaused) return;
      const snap = await refreshConnection(true);
      if (cancelled || isPaused) return;
      if (snap.state === 'online') {
        failures = 0;
        scheduleNext(60_000);
      } else {
        failures = Math.min(failures + 1, 6);
        const delay = Math.min(15_000 * 2 ** (failures - 1), 300_000);
        scheduleNext(delay);
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      } else {
        isPaused = false;
        tick();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    tick();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
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
        const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
        setIsCollapsed(saved ? JSON.parse(saved) : false);
      }
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Close flyout on Escape
  useEffect(() => {
    if (!activeFolder) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveFolder(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeFolder]);

  // Reposition flyout when sidebar collapses/expands
  useEffect(() => {
    if (!activeFolder) return;
    const btn = folderRefs.current.get(activeFolder);
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setPopupPos({ top: rect.top, left: isCollapsed ? 62 : 245 });
  }, [isCollapsed, activeFolder]);

  const openFolderPopup = useCallback((id: string) => {
    const btn = folderRefs.current.get(id);
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setPopupPos({ top: rect.top, left: isCollapsed ? 62 : 245 });
    setActiveFolder(prev => prev === id ? null : id);
  }, [isCollapsed]);

  const isFolderActive = (folder: NavFolder) =>
    folder.items.some(item => !item.external && location.pathname === item.path);

  const sidebarClass = `sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`;

  const toggleSidebar = () => {
    setIsCollapsed((prev: boolean) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const renderNavItem = (item: NavItem, className = '') => {
    if (item.disabled) {
      return (
        <div key={item.id} className={`sidebar__link sidebar__link--disabled ${className}`} title={item.label}>
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
          `sidebar__link ${isActive ? 'sidebar__link--active' : ''} ${className}`
        }
        title={item.label}
      >
        <span className="sidebar__link-icon">{item.icon}</span>
        <span className="sidebar__link-label">{item.label}</span>
      </NavLink>
    );
  };

  const activeFolderData = activeFolder ? ALL_FOLDERS.find(f => f.id === activeFolder) : null;

  return (
    <div className="dashboard">
      {/* Sidebar backdrop (for flyout) */}
      {activeFolder && (
        <div className="sidebar__backdrop" onClick={() => setActiveFolder(null)} />
      )}

      {/* Flyout popup for folder items */}
      {activeFolderData && (
        <div
          className="sidebar__flyout"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          {activeFolderData.items.map(item => (
            item.external ? (
              <a
                key={item.id}
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setActiveFolder(null)}
                className="sidebar__flyout-item"
              >
                <span className="sidebar__flyout-icon">{item.icon}</span>
                <span className="sidebar__flyout-label">{item.label}</span>
              </a>
            ) : (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => setActiveFolder(null)}
                className={({ isActive }) =>
                  `sidebar__flyout-item ${isActive ? 'sidebar__flyout-item--active' : ''}`
                }
              >
                <span className="sidebar__flyout-icon">{item.icon}</span>
                <span className="sidebar__flyout-label">{item.label}</span>
              </NavLink>
            )
          ))}
        </div>
      )}

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
            {MAIN_NAV.map(item => renderNavItem(item))}
          </div>

          <div className="sidebar__divider" />

          <div className="sidebar__section">
            {FOLDERS.map(folder => (
              <button
                key={folder.id}
                ref={el => { if (el) folderRefs.current.set(folder.id, el); else folderRefs.current.delete(folder.id); }}
                className={`sidebar__folder ${isCollapsed ? 'sidebar__folder--collapsed' : ''} ${isFolderActive(folder) ? 'sidebar__folder--active' : ''} ${activeFolder === folder.id ? 'sidebar__folder--open' : ''}`}
                onClick={() => openFolderPopup(folder.id)}
                title={isCollapsed ? folder.label : undefined}
              >
                <span className="sidebar__folder-icon">{folder.icon}</span>
                {!isCollapsed && <span className="sidebar__folder-label">{folder.label}</span>}
                {!isCollapsed && <ChevronRight size={14} className="sidebar__folder-chevron" />}
              </button>
            ))}
          </div>


          <div className="sidebar__divider" />

          <div className="sidebar__section">
            <button
              ref={el => { if (el) folderRefs.current.set(AI_SERVICES_FOLDER.id, el); else folderRefs.current.delete(AI_SERVICES_FOLDER.id); }}
              className={`sidebar__folder ${isCollapsed ? 'sidebar__folder--collapsed' : ''} ${activeFolder === AI_SERVICES_FOLDER.id ? 'sidebar__folder--open' : ''}`}
              onClick={() => openFolderPopup(AI_SERVICES_FOLDER.id)}
              title={isCollapsed ? AI_SERVICES_FOLDER.label : undefined}
            >
              <span className="sidebar__folder-icon">{AI_SERVICES_FOLDER.icon}</span>
              {!isCollapsed && <span className="sidebar__folder-label">{AI_SERVICES_FOLDER.label}</span>}
              {!isCollapsed && <ChevronRight size={14} className="sidebar__folder-chevron" />}
            </button>
          </div>

          <div className="sidebar__section sidebar__section--bottom">
            {renderNavItem({
              id: 'settings',
              label: 'Настройки',
              path: '/settings',
              icon: <Settings size={18} />,
            })}
          </div>

          <div className="sidebar__divider" />
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

      <BookmarkDrawer isOpen={isBookmarksOpen} onClose={() => setIsBookmarksOpen(false)} docked />

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
          <IconButton
            variant="ghost"
            size="sm"
            icon={<Bookmark size={15} />}
            label={isBookmarksOpen ? 'Закрыть закладки' : 'Открыть закладки'}
            onClick={() => setIsBookmarksOpen((prev) => !prev)}
          />
          <span className="statusbar__item">
            commit: {__APP_GIT_COMMIT__}
          </span>
        </div>
      </footer>

    </div>
  );
}
