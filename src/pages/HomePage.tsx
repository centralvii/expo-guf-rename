import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FileArchive, FileText, Wrench, ArrowRight } from 'lucide-react';

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
    title: 'GUF Packer',
    description:
      'Пакетное переименование файлов .guf из ZIP-архива с поддержкой шаблонов, массового заполнения и drag-and-drop сортировки.',
    icon: <FileArchive size={24} />,
    path: '/guf-packer',
    tag: 'ГОТОВО',
    tagColor: 'green',
  },
  {
    id: 'task-helper',
    title: 'Task Helper',
    description:
      'Реестр экземпляров задач со структурированными разделами и поддержкой Markdown. Создавайте заметки и инструкции.',
    icon: <FileText size={24} />,
    path: '/task-helper',
    tag: 'NEW',
    tagColor: 'accent',
  },
  {
    id: 'another-tool',
    title: 'Новый инструмент',
    description: 'Здесь появится следующий инструмент. Следите за обновлениями.',
    icon: <Wrench size={24} />,
    path: '/',
    tag: 'СКОРО',
    tagColor: 'gray',
    disabled: true,
  },
];

export function HomePage() {
  return (
    <div className="home">
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

      <section className="home-grid">
        {TOOLS.map((tool) => (
          <Link 
            to={tool.disabled ? "#" : tool.path} 
            key={tool.id} 
            className={`tool-card ${tool.disabled ? 'tool-card--disabled' : ''}`}
            onClick={(e) => tool.disabled && e.preventDefault()}
          >
            <div className="tool-card__header">
              <div className={`tool-card__icon ${tool.disabled ? 'tool-card__icon--muted' : ''}`}>
                {tool.icon}
              </div>
              <span className={`tool-card__tag tool-card__tag--${tool.tagColor}`}>
                {tool.tag}
              </span>
            </div>
            <h2 className={`tool-card__title ${tool.disabled ? 'tool-card__title--muted' : ''}`}>
              {tool.title}
            </h2>
            <p className="tool-card__desc">{tool.description}</p>
            <div className="tool-card__footer">
              <span className="tool-card__link">
                {tool.disabled ? 'В разработке' : (
                  <>Открыть <ArrowRight size={14} /></>
                )}
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
