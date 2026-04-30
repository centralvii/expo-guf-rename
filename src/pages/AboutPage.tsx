import {
  FileArchive, FileText, Zap, Shield, Database,
  Code2, Layers
} from 'lucide-react';

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface ToolInfo {
  icon: React.ReactNode;
  title: string;
  badge: string;
  features: string[];
  color: string;
}

const TOOLS: ToolInfo[] = [
  {
    icon: <FileArchive size={20} />,
    title: 'Сборка GUF',
    badge: 'ГОТОВО',
    color: '#0070f3',
    features: [
      'Пакетное переименование .guf файлов из ZIP-архива',
      'Гибкие шаблоны с тегами: {cleanName}, {date}, {index} и др.',
      'Drag & Drop сортировка файлов',
      'Массовое заполнение переменных',
      'Генератор README для архива',
      'Экспорт готового ZIP одной кнопкой',
    ],
  },
  {
    icon: <FileText size={20} />,
    title: 'Задачник',
    badge: 'ГОТОВО',
    color: '#7928ca',
    features: [
      'Реестр задач с приоритетами и статусами',
      'Структурированные разделы с поддержкой Markdown',
      'Теги с цветовой маркировкой',
      'Экспорт задачи в .md файл',
      'Фильтрация по статусу, приоритету и тегам',
      'Синхронизация через Supabase',
    ],
  },
];

const HIGHLIGHTS: FeatureItem[] = [
  {
    icon: <Shield size={18} />,
    title: 'Приватность',
    description: 'Файлы обрабатываются локально в браузере и никогда не передаются на сервер.',
  },
  {
    icon: <Zap size={18} />,
    title: 'Скорость',
    description: 'Мгновенный отклик благодаря React 19 + Vite и оптимизированному рендерингу.',
  },
  {
    icon: <Database size={18} />,
    title: 'Персистентность',
    description: 'Состояние сохраняется в IndexedDB — данные не теряются после перезагрузки.',
  },
  {
    icon: <Layers size={18} />,
    title: 'Дизайн-система',
    description: 'Единый CSS-дизайн с тёмной темой, glassmorphism и плавными анимациями.',
  },
];

const STACK = [
  { name: 'React 19', desc: 'UI-фреймворк', color: '#61dafb' },
  { name: 'TypeScript', desc: 'Strict mode', color: '#3178c6' },
  { name: 'Vite', desc: 'Сборщик', color: '#646cff' },
  { name: 'Supabase', desc: 'База данных', color: '#3ecf8e' },
  { name: 'PostgreSQL', desc: 'SQL база', color: '#336791' },
  { name: 'lucide-react', desc: 'Иконки', color: '#f97316' },
  { name: '@dnd-kit', desc: 'Drag & Drop', color: '#a855f7' },
  { name: 'jszip', desc: 'ZIP-архивы', color: '#f59e0b' },
  { name: 'react-markdown', desc: 'Markdown', color: '#22c55e' },
  { name: 'remark-gfm', desc: 'GFM таблицы', color: '#16a34a' },
  { name: 'idb-keyval', desc: 'IndexedDB', color: '#e879f9' },
  { name: 'react-router-dom', desc: 'Роутинг', color: '#ef4444' },
  { name: 'CSS3', desc: 'Дизайн-система', color: '#2563eb' },
  { name: 'Glassmorphism', desc: 'UI-стиль', color: '#7dd3fc' },
  { name: 'Vite PWA', desc: 'Оффлайн', color: '#818cf8' },
  { name: 'ESLint', desc: 'Линтер', color: '#4b32c3' },
  { name: 'crypto.randomUUID', desc: 'ID генерация', color: '#94a3b8' },
  { name: 'Vercel', desc: 'Деплой', color: '#ffffff' },
];

export function AboutPage() {
  return (
    <div className="about-page anim-fade-in">

      {/* Hero */}
      <section className="about-hero">
        <div className="about-hero__logo">
          <img src="/logo.svg" alt="GreenData Helper" />
        </div>
        <div className="about-hero__text">
          <h1 className="about-hero__title">
            GreenData <span className="about-hero__accent">Helper</span>
          </h1>
          <p className="about-hero__subtitle">
            Набор инструментов для автоматизации рутинных процессов при работе с игровыми ресурсами и документацией.
          </p>
          <div className="about-hero__badges">
            <span className="about-badge about-badge--blue">React 19</span>
            <span className="about-badge about-badge--blue">TypeScript</span>
            <span className="about-badge about-badge--purple">Vite</span>
            <span className="about-badge about-badge--green">Open Source</span>
          </div>
        </div>
      </section>

      {/* Stack marquee */}
      <div className="about-marquee-wrap">
        <div className="about-marquee">
          <div className="about-marquee__track">
            {[...STACK, ...STACK].map((item, i) => (
              <span key={i} className="about-marquee__item">
                <span className="about-marquee__dot" style={{ background: item.color }} />
                <span className="about-marquee__name">{item.name}</span>
                <span className="about-marquee__desc">{item.desc}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Highlights */}
      <section className="about-section">
        <h2 className="about-section__title">Ключевые принципы</h2>
        <div className="about-highlights">
          {HIGHLIGHTS.map((item) => (
            <div key={item.title} className="about-highlight-card">
              <div className="about-highlight-card__icon">{item.icon}</div>
              <div>
                <div className="about-highlight-card__title">{item.title}</div>
                <div className="about-highlight-card__desc">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tools */}
      <section className="about-section">
        <h2 className="about-section__title">Инструменты</h2>
        <div
          className="about-tools"
          style={{ gridTemplateColumns: `repeat(${Math.min(TOOLS.length, 4)}, 1fr)` }}
        >
          {TOOLS.map((tool) => (
            <div key={tool.title} className="about-tool-card" style={{ '--tool-color': tool.color } as React.CSSProperties}>
              <div className="about-tool-card__header">
                <div className="about-tool-card__icon">{tool.icon}</div>
                <div className="about-tool-card__name">{tool.title}</div>
                <span className="about-tool-card__badge">{tool.badge}</span>
              </div>
              <ul className="about-tool-card__features">
                {tool.features.map((f) => (
                  <li key={f} className="about-tool-card__feature">
                    <Code2 size={12} className="about-tool-card__feature-icon" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
