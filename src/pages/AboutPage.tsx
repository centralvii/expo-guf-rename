import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileArchive, FileText, Zap, Shield, Database,
  Layers, ArrowRight, Check, Sparkles, Globe, Lock,
  Workflow
} from 'lucide-react';

/* ---- Typewriter ---- */

const TYPEWRITER_WORDS = [
  'Автоматизируй.',
  'Документируй.',
  'Оптимизируй.',
  'Масштабируй.',
  'Интегрируй.',
  'Ускоряй.',
  'Систематизируй.',
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

interface ToolInfo {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  badgeVariant: 'green' | 'blue';
  features: string[];
  color: string;
  path: string;
}

const TOOLS: ToolInfo[] = [
  {
    icon: <FileArchive size={22} />,
    title: 'Сборка GUF',
    description: 'Пакетная обработка и переименование .guf файлов из ZIP-архива.',
    badge: 'ГОТОВО',
    badgeVariant: 'green',
    color: '#0070f3',
    path: '/guf-packer',
    features: [
      'Шаблоны с тегами: {cleanName}, {date}, {index}',
      'Drag & Drop сортировка файлов',
      'Массовое заполнение переменных',
      'Генератор README для архива',
      'Экспорт готового ZIP',
    ],
  },
  {
    icon: <FileText size={22} />,
    title: 'Задачник',
    description: 'Реестр задач с приоритетами, статусами и поддержкой Markdown.',
    badge: 'ГОТОВО',
    badgeVariant: 'green',
    color: '#7928ca',
    path: '/task-helper',
    features: [
      'Структурированные разделы',
      'Теги с цветовой маркировкой',
      'Фильтрация и поиск',
      'Экспорт в Markdown',
      'Синхронизация через Supabase',
    ],
  },
  {
    icon: <Workflow size={22} />,
    title: 'BPMN Редактор',
    description: 'Визуальный конструктор бизнес-процессов на базе BPMN 2.0.',
    badge: 'НОВОЕ',
    badgeVariant: 'blue',
    color: '#22c55e',
    path: '/bpmn',
    features: [
      'Палитра событий, задач и шлюзов',
      'Импорт / экспорт .bpmn и .xml',
      'Сохранение диаграмм в браузере',
      'Drag & Drop построение',
      'Масштабирование и навигация',
    ],
  },
];

interface PrincipleItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}

const PRINCIPLES: PrincipleItem[] = [
  {
    icon: <Lock size={20} />,
    title: 'Приватность',
    description: 'Все файлы обрабатываются локально в браузере. Ничего не отправляется на сервер.',
    gradient: 'linear-gradient(135deg, #0070f3, #00a6ff)',
  },
  {
    icon: <Zap size={20} />,
    title: 'Мгновенный отклик',
    description: 'React 19 + Vite обеспечивают молниеносную скорость рендеринга и сборки.',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
  },
  {
    icon: <Database size={20} />,
    title: 'Сохранность данных',
    description: 'Состояние хранится в IndexedDB и Supabase — данные не теряются после перезагрузки.',
    gradient: 'linear-gradient(135deg, #22c55e, #10b981)',
  },
  {
    icon: <Layers size={20} />,
    title: 'Дизайн-система',
    description: 'Единый CSS с тёмной темой, glassmorphism эффектами и плавными анимациями.',
    gradient: 'linear-gradient(135deg, #7928ca, #a855f7)',
  },
  {
    icon: <Globe size={20} />,
    title: 'Доступность',
    description: 'Развёрнут на Vercel. Доступен из любого браузера без установки.',
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  },
  {
    icon: <Shield size={20} />,
    title: 'Надёжность',
    description: 'TypeScript strict mode, ESLint, постоянное тестирование на реальных данных.',
    gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
  },
];

const STACK = [
  { name: 'React 19', color: '#61dafb' },
  { name: 'TypeScript', color: '#3178c6' },
  { name: 'Vite', color: '#646cff' },
  { name: 'Supabase', color: '#3ecf8e' },
  { name: 'PostgreSQL', color: '#336791' },
  { name: 'lucide-react', color: '#f97316' },
  { name: '@dnd-kit', color: '#a855f7' },
  { name: 'jszip', color: '#f5a623' },
  { name: 'react-markdown', color: '#22c55e' },
  { name: 'remark-gfm', color: '#16a34a' },
  { name: 'idb-keyval', color: '#e879f9' },
  { name: 'react-router', color: '#ef4444' },
  { name: 'CSS3', color: '#2563eb' },
  { name: 'bpmn.io', color: '#ff6600' },
  { name: 'Vercel', color: '#ffffff' },
  { name: 'ESLint', color: '#4b32c3' },
];

const STATS = [
  { value: '3', label: 'Инструмента' },
  { value: '100%', label: 'Клиентская обработка' },
  { value: '0', label: 'Утечек данных' },
  { value: '∞', label: 'Возможностей' },
];

/* ---- Floating particles canvas ---- */

function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        o: Math.random() * 0.3 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.offsetWidth;
        if (p.x > canvas.offsetWidth) p.x = 0;
        if (p.y < 0) p.y = canvas.offsetHeight;
        if (p.y > canvas.offsetHeight) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 112, 243, ${p.o})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="about-v2__particles" />;
}

/* ---- Component ---- */

export function AboutPage() {
  const typedText = useTypewriter(TYPEWRITER_WORDS);

  return (
    <div className="about-v2 anim-fade-in">

      {/* ===== HERO ===== */}
      <section className="about-v2__hero">
        <ParticlesCanvas />
        <div className="about-v2__hero-glow" />
        <div className="about-v2__hero-content">
          <div className="about-v2__hero-badge">
            <Sparkles size={12} />
            <span>Набор инструментов для GreenData</span>
          </div>
          <h1 className="about-v2__hero-title">
            <span className="about-v2__hero-title-accent" style={{ minHeight: '1.2em', display: 'block' }}>
              {typedText}
              <span className="typewriter__cursor">|</span>
            </span>
          </h1>
          <p className="about-v2__hero-desc">
            GD Helper — коллекция веб-инструментов для работы с проектными ресурсами, задачами
            и бизнес-процессами. Всё работает прямо в браузере, без установки.
          </p>
          <div className="about-v2__hero-actions">
            <Link to="/" className="about-v2__cta-primary">
              Начать работу <ArrowRight size={16} />
            </Link>
            <a
              href="https://github.com/centralvii/expo-guf-rename"
              target="_blank"
              rel="noopener noreferrer"
              className="about-v2__cta-secondary"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="about-v2__stats">
        {STATS.map((stat) => (
          <div key={stat.label} className="about-v2__stat">
            <div className="about-v2__stat-value">{stat.value}</div>
            <div className="about-v2__stat-label">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* ===== TOOLS ===== */}
      <section className="about-v2__section">
        <div className="about-v2__section-header">
          <span className="about-v2__section-tag">Инструменты</span>
          <h2 className="about-v2__section-title">Всё необходимое в одном месте</h2>
          <p className="about-v2__section-desc">Три специализированных инструмента для повседневной работы</p>
        </div>
        <div className="about-v2__tools-grid">
          {TOOLS.map((tool) => (
            <Link
              to={tool.path}
              key={tool.title}
              className="about-v2__tool-card"
              style={{ '--tool-color': tool.color } as React.CSSProperties}
            >
              <div className="about-v2__tool-card-glow" />
              <div className="about-v2__tool-header">
                <div className="about-v2__tool-icon">{tool.icon}</div>
                <span className={`about-v2__tool-badge about-v2__tool-badge--${tool.badgeVariant}`}>
                  {tool.badge}
                </span>
              </div>
              <h3 className="about-v2__tool-title">{tool.title}</h3>
              <p className="about-v2__tool-desc">{tool.description}</p>
              <ul className="about-v2__tool-features">
                {tool.features.map((f) => (
                  <li key={f}><Check size={14} /><span>{f}</span></li>
                ))}
              </ul>
              <div className="about-v2__tool-cta">
                <span>Открыть</span>
                <ArrowRight size={14} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== PRINCIPLES ===== */}
      <section className="about-v2__section">
        <div className="about-v2__section-header">
          <span className="about-v2__section-tag">Принципы</span>
          <h2 className="about-v2__section-title">Почему GD Helper?</h2>
          <p className="about-v2__section-desc">Продуманный подход к каждому аспекту</p>
        </div>
        <div className="about-v2__principles-grid">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="about-v2__principle">
              <div className="about-v2__principle-icon" style={{ background: p.gradient }}>
                {p.icon}
              </div>
              <h4 className="about-v2__principle-title">{p.title}</h4>
              <p className="about-v2__principle-desc">{p.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== TECH STACK MARQUEE ===== */}
      <section className="about-v2__section">
        <div className="about-v2__section-header">
          <span className="about-v2__section-tag">Стек</span>
          <h2 className="about-v2__section-title">Технологии</h2>
        </div>
        <div className="about-v2__marquee-wrap">
          <div className="about-v2__marquee">
            <div className="about-v2__marquee-track">
              {[...STACK, ...STACK].map((item, i) => (
                <span key={i} className="about-v2__marquee-item">
                  <span className="about-v2__marquee-dot" style={{ background: item.color }} />
                  <span className="about-v2__marquee-name">{item.name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== BOTTOM CTA ===== */}
      <section className="about-v2__bottom-cta">
        <div className="about-v2__bottom-cta-glow" />
        <h2 className="about-v2__bottom-title">Готов начать?</h2>
        <p className="about-v2__bottom-desc">
          Выбери инструмент и приступай к работе. Никакой регистрации, никаких ограничений.
        </p>
        <Link to="/" className="about-v2__cta-primary about-v2__cta-primary--lg">
          Перейти к инструментам <ArrowRight size={18} />
        </Link>
      </section>

    </div>
  );
}
