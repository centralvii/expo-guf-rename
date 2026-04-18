/**
 * Общий Layout для всех страниц GD Helper.
 * Header + content + footer.
 */

import { Outlet, Link } from 'react-router-dom';
import { Boxes, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function Layout() {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__left">
            <Link to="/" className="app-header__logo">
              <div className="app-header__logo-icon">
                <Boxes size={22} />
              </div>
              <span className="app-header__wordmark">GD Helper</span>
            </Link>

            <nav className="app-header__nav">
              <div className="app-header__dropdown-container" ref={dropdownRef}>
                <button 
                  className={`app-header__nav-link app-header__nav-btn ${isToolsOpen ? 'app-header__nav-link--active' : ''}`}
                  onClick={() => setIsToolsOpen(!isToolsOpen)}
                >
                  Инструменты
                  <ChevronDown size={14} className={`dropdown-arrow ${isToolsOpen ? 'open' : ''}`} />
                </button>
                
                <div className={`app-header__dropdown-menu ${isToolsOpen ? 'open' : ''}`}>
                  <Link to="/" className="dropdown-item" onClick={() => setIsToolsOpen(false)}>
                    <div className="dropdown-item-title">Все инструменты</div>
                    <div className="dropdown-item-desc">Главная страница со списком</div>
                  </Link>
                  <Link to="/guf-packer" className="dropdown-item" onClick={() => setIsToolsOpen(false)}>
                    <div className="dropdown-item-title">GUF Packer</div>
                    <div className="dropdown-item-desc">Групповое переименование</div>
                  </Link>
                </div>
              </div>
              <a href="#" className="app-header__nav-link">Ресурсы</a>
              <a href="#" className="app-header__nav-link">Документация</a>
            </nav>
          </div>
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
