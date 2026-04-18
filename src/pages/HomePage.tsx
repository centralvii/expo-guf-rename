/**
 * Главная страница — выбор инструмента GD Helper.
 * Карточки инструментов в стиле Vercel.
 */

import { Link } from 'react-router-dom';
import { FileArchive, Wrench, ArrowRight } from 'lucide-react';

interface ToolCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  tag: string;
  tagColor: string;
}

const TOOLS: ToolCard[] = [
  {
    id: 'guf-packer',
    title: 'GUF Packer',
    description:
      'Пакетное переименование файлов .guf из ZIP-архива с поддержкой шаблонов, массового заполнения и drag-and-drop сортировки.',
    icon: <FileArchive size={24} />,
    path: '/guf-packer',
    tag: 'Готово',
    tagColor: 'green',
  },
  // Будущие инструменты:
  // {
  //   id: 'another-tool',
  //   title: 'Another Tool',
  //   description: 'Описание...',
  //   icon: <Wrench size={24} />,
  //   path: '/another-tool',
  //   tag: 'Скоро',
  //   tagColor: 'gray',
  // },
];

export function HomePage() {
  return (
    <div className="home">
      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero__badge">
          <Wrench size={14} />
          <span>Набор инструментов</span>
        </div>
        <h1 className="home-hero__title">
          <span className="home-hero__title-gd">GD</span> Helper
        </h1>
        <p className="home-hero__subtitle">
          Инструменты для работы с проектами GD.
          <br />
          Выберите нужный инструмент, чтобы начать.
        </p>
      </section>

      {/* Tool cards grid */}
      <section className="home-grid">
        {TOOLS.map((tool) => (
          <Link to={tool.path} key={tool.id} className="tool-card">
            <div className="tool-card__header">
              <div className="tool-card__icon">{tool.icon}</div>
              <span
                className={`tool-card__tag tool-card__tag--${tool.tagColor}`}
              >
                {tool.tag}
              </span>
            </div>
            <h2 className="tool-card__title">{tool.title}</h2>
            <p className="tool-card__desc">{tool.description}</p>
            <div className="tool-card__footer">
              <span className="tool-card__link">
                Открыть
                <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        ))}

        {/* Placeholder для будущих инструментов */}
        <div className="tool-card tool-card--placeholder">
          <div className="tool-card__header">
            <div className="tool-card__icon tool-card__icon--muted">
              <Wrench size={24} />
            </div>
            <span className="tool-card__tag tool-card__tag--gray">Скоро</span>
          </div>
          <h2 className="tool-card__title tool-card__title--muted">
            Новый инструмент
          </h2>
          <p className="tool-card__desc">
            Здесь появится следующий инструмент. Следите за обновлениями.
          </p>
        </div>
      </section>
    </div>
  );
}
