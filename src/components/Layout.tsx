/**
 * Общий Layout для всех страниц GD Helper.
 * Header + content + footer.
 */

import { Outlet, Link, useLocation } from 'react-router-dom';
import { Boxes } from 'lucide-react';

export function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/" className="app-header__logo">
            <div className="app-header__logo-icon">
              <Boxes size={22} />
            </div>
            <span className="app-header__wordmark">GD Helper</span>
          </Link>

          {!isHome && (
            <nav className="app-header__nav">
              <Link to="/" className="app-header__nav-link">
                Все инструменты
              </Link>
            </nav>
          )}
        </div>
      </header>

      {/* Page content */}
      <main className="app-main">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <span>GD Helper &mdash; клиентское приложение, файлы не покидают ваш браузер</span>
      </footer>
    </div>
  );
}
