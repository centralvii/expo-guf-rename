import { type ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileArchive, FileText, Wrench, ArrowRight, Activity, Clock } from 'lucide-react';

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

interface ToolCard {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  path: string;
  tag: string;
  tagColor: string;
  disabled?: boolean;
}

const TOOLS: ToolCard[] = [
  {
    id: 'guf-packer',
    title: 'Сборка GUF',
    description:
      'Пакетное переименование файлов .guf из ZIP-архива с поддержкой шаблонов, массового заполнения и drag-and-drop сортировки.',
    icon: <FileArchive size={22} />,
    path: '/guf-packer',
    tag: 'ГОТОВО',
    tagColor: 'green',
  },
  {
    id: 'task-helper',
    title: 'Задачник',
    description:
      'Реестр экземпляров задач со структурированными разделами и поддержкой Markdown. Создавайте заметки и инструкции.',
    icon: <FileText size={22} />,
    path: '/task-helper',
    tag: 'ГОТОВО',
    tagColor: 'green',
  }
  // {
  //   id: 'another-tool',
  //   title: 'Новый инструмент',
  //   description: 'Здесь появится следующий инструмент. Следите за обновлениями.',
  //   icon: <Wrench size={22} />,
  //   path: '/',
  //   tag: 'СКОРО',
  //   tagColor: 'gray',
  //   disabled: true,
  // },
];

export function HomePage() {
  const typedText = useTypewriter(TYPEWRITER_WORDS);

  return (
    <div className="home-dashboard anim-fade-in">
      {/* Welcome Banner */}
      <section className="welcome-banner">
        <div className="welcome-banner__content">
          <div className="welcome-banner__icon" style={{ background: 'none', border: 'none' }}>
            <img src="/logo.svg" alt="Logo" style={{ width: '64px', height: '64px' }} />
          </div>
          <div className="welcome-banner__text">
            <h2 className="welcome-banner__title">
              Добро пожаловать в <span className="welcome-banner__highlight">GreenData Helper</span>
            </h2>
            <div className="typewriter">
              <span className="typewriter__text">{typedText}</span>
              <span className="typewriter__cursor">|</span>
            </div>
            <p className="welcome-banner__subtitle">
              Инструменты для работы с проектами GreenData. Выберите нужный инструмент, чтобы начать.
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

      {/* Tools Grid */}
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
    </div>
  );
}
