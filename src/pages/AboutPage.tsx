import { memo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ExternalLink,
  FileArchive,
  FileText,
  Workflow,
  Send,
  Settings as SettingsIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, PageTitle, Toolbar } from '../ui';
import { useSettings } from '../hooks/useSettings';
import {
  getConnectionSnapshot,
  refreshConnection,
  subscribeToConnection,
  type ConnectionSnapshot,
} from '../lib/connectionStatus';
import type { AppTheme, ConnectionMethod } from '../types';
import { version as appVersion } from '../../package.json';

import './About/About.css';

declare const __APP_GIT_COMMIT__: string;

const REPO_URL = 'https://github.com/centralvii/expo-guf-rename';

/* ---------- Static data ---------- */

interface ModuleEntry {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: ReactNode;
}

const MODULES: ModuleEntry[] = [
  {
    id: 'tasks',
    title: 'Задачник',
    description: 'Задачи, шаблоны, секции, история изменений и diff.',
    path: '/task-helper',
    icon: <FileText size={14} />,
  },
  {
    id: 'guf',
    title: 'Сборка GUF',
    description: 'Обработка ZIP/GUF, шаблоны переименования, экспорт.',
    path: '/guf-packer',
    icon: <FileArchive size={14} />,
  },
  {
    id: 'api',
    title: 'Запросник',
    description: 'Запросы, окружения, переменные, связь с задачами.',
    path: '/api-client',
    icon: <Send size={14} />,
  },
  {
    id: 'bpmn',
    title: 'Полигон BPMN',
    description: 'Просмотр BPMN-диаграмм и анализ процессов.',
    path: '/bpmn',
    icon: <Workflow size={14} />,
  },
  {
    id: 'settings',
    title: 'Настройки',
    description: 'Темы, провайдеры, подключения, миграции.',
    path: '/settings',
    icon: <SettingsIcon size={14} />,
  },
];

interface DataRow {
  entity: string;
  storage: string;
}

const DATA_ROWS: DataRow[] = [
  { entity: 'Задачи', storage: 'слой провайдера' },
  { entity: 'История задач', storage: 'слой провайдера' },
  { entity: 'Файлы GUF', storage: 'только в браузере' },
  { entity: 'Запросы API', storage: 'локальное хранилище' },
  { entity: 'Диаграммы BPMN', storage: 'локальное хранилище' },
  { entity: 'Настройки', storage: 'localStorage' },
];

interface ArchitectureNote {
  id: string;
  title: string;
  description: string;
}

const ARCHITECTURE_NOTES: ArchitectureNote[] = [
  {
    id: 'browser-first',
    title: 'Локально в браузере',
    description: 'Обработка GUF/ZIP выполняется на стороне клиента, файлы не уходят на сервер.',
  },
  {
    id: 'repository-layer',
    title: 'Слой repository',
    description: 'Задачник работает через taskRepository, а не через прямые SDK-вызовы из компонентов.',
  },
  {
    id: 'provider-adapters',
    title: 'Адаптеры провайдеров',
    description: 'Supabase, Firebase и PostgreSQL proxy подключаются через единый database layer.',
  },
  {
    id: 'theme-tokens',
    title: 'Токены тем',
    description: 'Темы Default / Nothing / 099 строятся через CSS-переменные, без перекраски страниц.',
  },
];

interface StackGroup {
  id: string;
  label: string;
  items: string[];
}

const STACK_GROUPS: StackGroup[] = [
  {
    id: 'runtime',
    label: 'Среда',
    items: ['React 19', 'TypeScript', 'Vite', 'React Router'],
  },
  {
    id: 'data',
    label: 'Данные',
    items: ['Supabase', 'Firebase', 'PostgreSQL proxy'],
  },
  {
    id: 'tools',
    label: 'Инструменты',
    items: ['JSZip', 'BPMN.io', 'react-markdown', '@dnd-kit', 'lucide-react'],
  },
];

const MANIFEST_LINES = [
  'декомпозиции задач',
  'подготовки GUF-пакетов',
  'отладки API',
  'анализа процессов',
  'миграции провайдеров',
];

/* ---------- Labels ---------- */

const THEME_LABELS: Record<AppTheme, string> = {
  default: 'default',
  nothing: 'nothing',
  '099': '099',
};

const PROVIDER_LABELS: Record<ConnectionMethod, string> = {
  supabase: 'supabase',
  firebase: 'firebase',
  postgres: 'postgres',
};

function getConnectionLabel(snapshot: ConnectionSnapshot): string {
  if (snapshot.state === 'online') return 'в сети';
  if (snapshot.state === 'offline') return 'офлайн';
  return 'неизвестно';
}

/* ---------- Subcomponents ---------- */

interface DossierSectionProps {
  number: string;
  title: string;
  children: ReactNode;
}

const DossierSection = memo(function DossierSection({ number, title, children }: DossierSectionProps) {
  return (
    <section className="about-dossier-section">
      <header className="about-dossier-section__index">
        <span className="about-dossier-section__number">{number}</span>
        <span className="about-dossier-section__title">{title}</span>
      </header>
      <div className="about-dossier-section__content">{children}</div>
    </section>
  );
});

interface SystemMetaRowProps {
  label: string;
  value: ReactNode;
}

const SystemMetaRow = memo(function SystemMetaRow({ label, value }: SystemMetaRowProps) {
  return (
    <div className="about-system-row">
      <span className="about-system-row__label">{label}</span>
      <span className="about-system-row__value">{value}</span>
    </div>
  );
});

/* ---------- Page ---------- */

export function AboutPage() {
  const { settings } = useSettings();
  const [connection, setConnection] = useState<ConnectionSnapshot>(() => getConnectionSnapshot());

  useEffect(() => {
    const unsubscribe = subscribeToConnection(setConnection);
    void refreshConnection();
    return unsubscribe;
  }, []);

  const themeLabel = THEME_LABELS[settings.theme] ?? settings.theme;
  const providerLabel = PROVIDER_LABELS[settings.connectionMethod] ?? settings.connectionMethod;
  const connectionLabel = getConnectionLabel(connection);
  const buildMode = import.meta.env.MODE;

  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content tool-page__content--auto">
        <Toolbar>
          <Toolbar.Left>
            <PageTitle>О проекте</PageTitle>
          </Toolbar.Left>
          <Toolbar.Right>
            <Link to="/" className="about-link-reset">
              <Button variant="secondary" size="sm" icon={<ArrowRight size={14} />}>
                К инструментам
              </Button>
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="about-link-reset"
            >
              <Button variant="secondary" size="sm" icon={<ExternalLink size={14} />}>
                GitHub
              </Button>
            </a>
          </Toolbar.Right>
        </Toolbar>

        <article className="about-dossier">
          {/* Hero / Project identity */}
          <header className="about-hero">
            <div className="about-hero__main">
              <span className="about-hero__eyebrow">Паспорт проекта</span>
              <h1 className="about-hero__title">GD Helper</h1>
              <p className="about-hero__lede">
                Браузерное рабочее пространство для процессов GreenData / Expo.
              </p>
              <p className="about-hero__desc">
                GD Helper объединяет рабочие инструменты для задач, GUF-файлов, API-запросов,
                BPMN-процессов и настроек backend-провайдера. Проект рассчитан на локальную
                работу в браузере и единый provider-layer для данных задач.
              </p>
              <div className="about-manifest">
                <span className="about-manifest__label">Создан для</span>
                <ul className="about-manifest__list">
                  {MANIFEST_LINES.map((line) => (
                    <li key={line} className="about-manifest__item">
                      <span className="about-manifest__bullet">—</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <aside className="about-hero__system">
              <span className="about-system__label">Проект</span>
              <div className="about-system__rows">
                <SystemMetaRow label="название" value="gd-helper" />
                <SystemMetaRow label="версия" value={appVersion} />
                <SystemMetaRow label="коммит" value={__APP_GIT_COMMIT__} />
                <SystemMetaRow label="тема" value={themeLabel} />
                <SystemMetaRow label="провайдер" value={providerLabel} />
                <SystemMetaRow label="соединение" value={connectionLabel} />
                <SystemMetaRow label="режим" value={buildMode} />
              </div>
            </aside>
          </header>

          {/* 01 Mission */}
          <DossierSection number="01" title="Миссия">
            <p className="about-prose">
              GD Helper нужен как единый рабочий слой поверх ежедневных задач разработки и
              сопровождения GreenData / Expo: подготовка задач, сборка GUF-пакетов, проверка
              API, просмотр BPMN и управление backend-провайдером.
            </p>
            <p className="about-prose about-prose--muted">
              Главная цель — собрать инструменты в одном месте, держать данные близко к
              разработчику и не зависеть от конкретного backend-а.
            </p>
          </DossierSection>

          {/* 02 Modules */}
          <DossierSection number="02" title="Модули">
            <ul className="about-module-table">
              {MODULES.map((module) => (
                <li key={module.id} className="about-module-row">
                  <Link to={module.path} className="about-module-row__link">
                    <span className="about-module-row__name">
                      <span className="about-module-row__icon">{module.icon}</span>
                      {module.title}
                    </span>
                    <span className="about-module-row__desc">{module.description}</span>
                    <span className="about-module-row__arrow" aria-hidden="true">
                      <ArrowRight size={14} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </DossierSection>

          {/* 03 Data ownership */}
          <DossierSection number="03" title="Данные">
            <ul className="about-data-table">
              {DATA_ROWS.map((row) => (
                <li key={row.entity} className="about-data-row">
                  <span className="about-data-row__entity">{row.entity}</span>
                  <span className="about-data-row__storage">{row.storage}</span>
                </li>
              ))}
            </ul>
            <p className="about-prose about-prose--muted">
              Файлы не отправляются на backend. Слой провайдера используется только для задач
              и истории задач.
            </p>
          </DossierSection>

          {/* 04 Architecture */}
          <DossierSection number="04" title="Архитектура">
            <ul className="about-note-list">
              {ARCHITECTURE_NOTES.map((note) => (
                <li key={note.id} className="about-note-row">
                  <span className="about-note-row__title">{note.title}</span>
                  <span className="about-note-row__desc">{note.description}</span>
                </li>
              ))}
            </ul>
          </DossierSection>

          {/* 05 Stack */}
          <DossierSection number="05" title="Стек">
            <div className="about-stack-groups">
              {STACK_GROUPS.map((group) => (
                <div key={group.id} className="about-stack-group">
                  <span className="about-stack-group__label">{group.label}</span>
                  <div className="about-stack-group__items">
                    {group.items.map((item) => (
                      <span key={item} className="about-stack-group__item">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DossierSection>
        </article>
      </div>
    </div>
  );
}
