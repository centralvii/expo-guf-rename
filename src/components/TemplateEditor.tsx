import { AVAILABLE_TAGS } from '../types';
import { RotateCcw, Tag, Save } from 'lucide-react';

interface TemplateEditorProps {
  template: string;
  onChange: (tpl: string) => void;
  onReset: () => void;
}

export function TemplateEditor({ template, onChange, onReset }: TemplateEditorProps) {
  const insertTag = (tag: string) => {
    onChange(template + tag);
  };

  return (
    <div className="template-card">
      <div className="template-card__header">
        <h2>
          <Tag size={18} />
          Шаблон переименования
          <span className="template-saved-badge" title="Шаблон автоматически сохраняется в браузере">
            <Save size={12} />
            сохранён
          </span>
        </h2>
        <button
          className="btn btn--ghost"
          onClick={onReset}
          title="Сбросить к шаблону по умолчанию"
        >
          <RotateCcw size={14} />
          Сбросить
        </button>
      </div>

      <input
        type="text"
        className="template-input"
        value={template}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Введите шаблон переименования..."
        spellCheck={false}
      />

      <div className="template-tags">
        <span className="template-tags__label">Вставить тег:</span>
        <div className="template-tags__list">
          {AVAILABLE_TAGS.map((tag) => (
            <button
              key={tag}
              className="tag-btn"
              onClick={() => insertTag(tag)}
              title={`Вставить ${tag}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
