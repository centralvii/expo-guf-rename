import { useRef, memo } from 'react';
import { BUILTIN_TAGS, type CustomVariable } from '../types';
import { RotateCcw, Tag, Save } from 'lucide-react';

// --- UI-Kit Imports ---
import { Button, Input, Island } from '../ui';

interface TemplateEditorProps {
  template: string;
  variables: CustomVariable[];
  onChange: (tpl: string) => void;
  onReset: () => void;
}

export const TemplateEditor = memo(({ template, variables, onChange, onReset }: TemplateEditorProps) => {
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

    requestAnimationFrame(() => {
      const newPos = start + tag.length;
      input.setSelectionRange(newPos, newPos);
      input.focus();
    });
  };

  const userTags = variables.map((v) => `{${v.key}}`);

  return (
    <Island className="template-card" flex={false}>
      <div className="template-card__header">
        <h2>
          <Tag size={18} />
          Шаблон переименования
          <span className="template-saved-badge">
            <Save size={12} />
            сохранён
          </span>
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          icon={<RotateCcw size={14} />}
        >
          Сбросить
        </Button>
      </div>

      <Input
        ref={inputRef}
        value={template}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Введите шаблон переименования..."
        spellCheck={false}
        fullWidth
      />

      <div className="template-tags">
        <span className="template-tags__label">Системные:</span>
        <div className="template-tags__list">
          {BUILTIN_TAGS.map((tag) => (
            <Button
              key={tag}
              variant="ghost"
              size="sm"
              className="tag-btn"
              onClick={() => insertTag(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      </div>

      {userTags.length > 0 && (
        <div className="template-tags template-tags--user">
          <span className="template-tags__label">Переменные:</span>
          <div className="template-tags__list">
            {userTags.map((tag) => (
              <Button
                key={tag}
                variant="ghost"
                size="sm"
                className={`tag-btn tag-btn--user ${template.includes(tag) ? 'tag-btn--active' : ''}`}
                onClick={() => insertTag(tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Island>
  );
});

TemplateEditor.displayName = 'TemplateEditor';
