import { useRef } from 'react';
import { BUILTIN_TAGS, type CustomVariable } from '../types';
import { RotateCcw, Tag, Save } from 'lucide-react';

interface TemplateEditorProps {
  template: string;
  variables: CustomVariable[];
  onChange: (tpl: string) => void;
  onReset: () => void;
}

export function TemplateEditor({ template, variables, onChange, onReset }: TemplateEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const insertTag = (tag: string) => {
    const input = inputRef.current;
    if (!input) {
      onChange(template + tag);
      return;
    }

    const start = input.selectionStart ?? template.length;
    const end = input.selectionEnd ?? template.length;

    const before = template.slice(0, start);
    const after = template.slice(end);
    const newTemplate = before + tag + after;

    onChange(newTemplate);

    // Restore cursor position after React re-renders
    requestAnimationFrame(() => {
      const newPos = start + tag.length;
      input.setSelectionRange(newPos, newPos);
      input.focus();
    });
  };

  // User tags
  const userTags = variables.map((v) => `{${v.key}}`);

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
        ref={inputRef}
        type="text"
        className="template-input"
        value={template}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Введите шаблон переименования..."
        spellCheck={false}
      />

      <div className="template-tags">
        <span className="template-tags__label">Системные:</span>
        <div className="template-tags__list">
          {BUILTIN_TAGS.map((tag) => (
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

      {userTags.length > 0 && (
        <div className="template-tags template-tags--user">
          <span className="template-tags__label">Переменные:</span>
          <div className="template-tags__list">
            {userTags.map((tag) => (
              <button
                key={tag}
                className={`tag-btn tag-btn--user ${template.includes(tag) ? 'tag-btn--active' : ''}`}
                onClick={() => insertTag(tag)}
                title={`Вставить ${tag}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
