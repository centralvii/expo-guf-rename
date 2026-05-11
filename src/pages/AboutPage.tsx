import { memo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ExternalLink, Shield, Zap, Database, Layers, Globe, Lock,
  Sparkles, FileArchive, FileText, Workflow, FileSearch, Send,
  BookOpen, Code2, Heart,
} from 'lucide-react';
import type { ReactNode } from 'react';

// --- UI-Kit Imports ---
import { Toolbar } from '../ui/Toolbar/Toolbar';
import { Island } from '../ui/Layout/Island';
import { PageTitle } from '../ui/Layout/PageTitle';
import { Button } from '../ui/Button/Button';
import { Badge } from '../ui/Badge/Badge';

import './About/About.css';

declare const __APP_GIT_COMMIT__: string;

const REPO_URL = 'https://github.com/centralvii/expo-guf-rename';

/* ---- Data ---- */

interface Principle {
  icon: ReactNode;
  title: string;
  description: string;
  accent: string;
}

const PRINCIPLES: Principle[] = [
  {
    icon: <Lock size={18} />,
    title: 'Приватность',
    description: 'Файлы обрабатываются в браузере. Данные не уходят на сторонние серверы.',
    accent: '#0070f3',
  },
  {
    icon: <Zap size={18} />,
    title: 'Скорость',
    description: 'React 19 и Vite обеспечивают мгновенный отклик интерфейса и сборки.',
    accent: '#f59e0b',
  },
  {
    icon: <Database size={18} />,
    title: 'Сохранность',
    description: 'Состояние пишется в IndexedDB и Supabase. Данные переживают перезагрузку.',
    accent: '#22c55e',
  },
  {
    icon: <Layers size={18} />,
    title: 'Дизайн-система',
    description: 'Единый UI Kit, тёмная тема, кастомная типографика и плавные переходы.',
    accent: '#a855f7',
  },
  {
    icon: <Globe size={18} />,
    title: 'Без установки',
    description: 'Открывается в любом современном браузере. Не требует прав администратора.',
    accent: '#06b6d4',
  },
  {
    icon: <Shield size={18} />,
    title: 'Надёжность',
    description: 'TypeScript strict mode, ESLint, отказ от any и сквозная типизация моделей.',
    accent: '#ec4899',
  },
];

interface ToolEntry {
  icon: ReactNode;
  title: string;
  path: string;
  color: string;
}

const TOOLS: ToolEntry[] = [
  { icon: <FileText size={16} />, title: 'Задачник', path: '/task-helper', color: '#7928ca' },
  { icon: <FileArchive size={16} />, title: 'Сборка GUF', path: '/guf-packer', color: '#0070f3' },
  { icon: <FileSearch size={16} />, title: 'Просмотр PDF', path: '/pdf-viewer', color: '#ff0080' },
  { icon: <Workflow size={16} />, title: 'Полигон BPMN', path: '/bpmn', color: '#22c55e' },
  { icon: <Send size={16} />, title: 'Запросник', path: '/api-client', color: '#f59e0b' },
];

const STACK = [
  'React 19', 'TypeScript', 'Vite', 'Supabase', 'PostgreSQL',
  'lucide-react', '@dnd-kit', 'jszip', 'react-markdown', 'bpmn.io',
  'react-router', 'pdf.js', 'CSS3', 'Vercel',
];

const STATS = [
  { value: '5', label: 'Инструментов' },
  { value: '100%', label: 'Клиентских' },
  { value: '0', label: 'Трекеров' },
  { value: '∞', label: 'Возможностей' },
];

/* ---- Subcomponents ---- */

const PrincipleCard = memo(function PrincipleCard({ principle }: { principle: Principle }) {
  const style = { '--principle-color': principle.accent } as React.CSSProperties;
  return (
    <article className="about-principle" style={style}>
      <div className="about-principle__icon">{principle.icon}</div>
      <h4 className="about-principle__title">{principle.title}</h4>
      <p className="about-principle__desc">{principle.description}</p>
    </article>
  );
});

const SectionBlock = memo(function SectionBlock({
  tag,
  title,
  description,
  children,
}: {
  tag: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="about-section">
      <header className="about-section__header">
        <span className="about-section__tag">{tag}</span>
        <h2 className="about-section__title">{title}</h2>
        {description && <p className="about-section__desc">{description}</p>}
      </header>
      {children}
    </section>
  );
});

/* ---- Main ---- */

export function AboutPage() {
  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content tool-page__content--auto">

        <Toolbar>
          <Toolbar.Left>
            <PageTitle>О проекте</PageTitle>
          </Toolbar.Left>
          <Toolbar.Right>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="about-link-reset">
              <Button variant="secondary" size="sm" icon={<ExternalLink size={14} />}>
                GitHub
              </Button>
            </a>
          </Toolbar.Right>
        </Toolbar>

        {/* Hero */}
        <Island flex={false} className="about-hero">
          <div className="about-hero__glow" aria-hidden="true" />
          <div className="about-hero__content">
            <div className="about-hero__badge">
              <Sparkles size={12} />
              <span>Инструменты для GreenData</span>
            </div>
            <h1 className="about-hero__title">
              <span className="about-hero__title-accent">GD Helper</span>
            </h1>
            <p className="about-hero__desc">
              Коллекция веб-инструментов для повседневных задач: работа с архивами,
              документацией, процессами и API. Всё работает прямо в браузере — без установки,
              без регистрации.
            </p>
            <div className="about-hero__actions">
              <Link to="/" className="about-link-reset">
                <Button variant="primary" size="md" icon={<ArrowRight size={14} />}>
                  К инструментам
                </Button>
              </Link>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="about-link-reset">
                <Button variant="secondary" size="md" icon={<ExternalLink size={14} />}>
                  Репозиторий
                </Button>
              </a>
            </div>
          </div>
        </Island>

        {/* Stats */}
        <div className="about-stats">
          {STATS.map((s) => (
            <Island key={s.label} flex={false} className="about-stats__cell">
              <div className="about-stats__value">{s.value}</div>
              <div className="about-stats__label">{s.label}</div>
            </Island>
          ))}
        </div>

        {/* Tools summary */}
        <SectionBlock
          tag="Инструменты"
          title="Что внутри"
          description="Пять специализированных модулей в одном интерфейсе"
        >
          <Island flex={false} className="about-tools-list">
            {TOOLS.map((t) => (
              <Link
                key={t.path}
                to={t.path}
                className="about-tool-row"
                style={{ '--tool-accent': t.color } as React.CSSProperties}
              >
                <span className="about-tool-row__icon">{t.icon}</span>
                <span className="about-tool-row__title">{t.title}</span>
                <ArrowRight size={14} className="about-tool-row__arrow" />
              </Link>
            ))}
          </Island>
        </SectionBlock>

        {/* Principles */}
        <SectionBlock
          tag="Принципы"
          title="Подход к разработке"
          description="Чем руководствуемся при проектировании и реализации"
        >
          <div className="about-principles-grid">
            {PRINCIPLES.map((p) => (
              <PrincipleCard key={p.title} principle={p} />
            ))}
          </div>
        </SectionBlock>

        {/* Stack */}
        <SectionBlock tag="Стек" title="Технологии">
          <Island flex={false} className="about-stack">
            {STACK.map((name) => (
              <Badge key={name} variant="default">{name}</Badge>
            ))}
          </Island>
        </SectionBlock>

        {/* Meta footer */}
        <div className="about-meta">
          <Island flex={false} className="about-meta__item">
            <div className="about-meta__icon"><Code2 size={18} /></div>
            <div className="about-meta__content">
              <span className="about-meta__label">Версия</span>
              <span className="about-meta__value">1.1.3</span>
            </div>
          </Island>

          <Island flex={false} className="about-meta__item">
            <div className="about-meta__icon"><BookOpen size={18} /></div>
            <div className="about-meta__content">
              <span className="about-meta__label">Commit</span>
              <span className="about-meta__value about-meta__value--mono">
                {__APP_GIT_COMMIT__}
              </span>
            </div>
          </Island>

          <Island flex={false} className="about-meta__item">
            <div className="about-meta__icon"><Heart size={18} /></div>
            <div className="about-meta__content">
              <span className="about-meta__label">Автор</span>
              <span className="about-meta__value">centralvii</span>
            </div>
          </Island>
        </div>

      </div>
    </div>
  );
}
