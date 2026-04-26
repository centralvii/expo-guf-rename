/**
 * Редактор README.txt для включения в архив.
 * Поддерживает markdown-форматирование с тулбаром и живым превью.
 */

import { useState, useRef, useCallback } from 'react';
import {
  FileText,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Link,
  Minus,
  Eye,
  EyeOff,
  CheckSquare,
  Eraser,
} from 'lucide-react';

interface ReadmeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

type MdAction = {
  icon: React.ReactNode;
  title: string;
  action: (
    textarea: HTMLTextAreaElement,
    value: string,
    onChange: (v: string) => void
  ) => void;
  separator?: false;
};

type MdSeparator = { separator: true };

type ToolbarItem = MdAction | MdSeparator;

function wrapSelection(
  ta: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  before: string,
  after: string
) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = value.slice(start, end);
  const replacement = before + (selected || 'текст') + after;
  const newValue = value.slice(0, start) + replacement + value.slice(end);
  onChange(newValue);
  requestAnimationFrame(() => {
    ta.focus();
    const cursorStart = start + before.length;
    const cursorEnd = cursorStart + (selected || 'текст').length;
    ta.setSelectionRange(cursorStart, cursorEnd);
  });
}

function prefixLine(
  ta: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  prefix: string
) {
  const start = ta.selectionStart;
  // find the beginning of the current line
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  onChange(newValue);
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(start + prefix.length, start + prefix.length);
  });
}

function insertAtCursor(
  ta: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  text: string
) {
  const start = ta.selectionStart;
  const newValue = value.slice(0, start) + text + value.slice(ta.selectionEnd);
  onChange(newValue);
  requestAnimationFrame(() => {
    ta.focus();
    const pos = start + text.length;
    ta.setSelectionRange(pos, pos);
  });
}

const TOOLBAR_ITEMS: ToolbarItem[] = [
  {
    icon: <Bold size={14} />,
    title: 'Жирный шрифт (Ctrl+B)',
    action: (ta, v, onChange) => wrapSelection(ta, v, onChange, '**', '**'),
  },
  {
    icon: <Italic size={14} />,
    title: 'Курсив (Ctrl+I)',
    action: (ta, v, onChange) => wrapSelection(ta, v, onChange, '_', '_'),
  },
  {
    icon: <Strikethrough size={14} />,
    title: 'Зачёркнутый текст',
    action: (ta, v, onChange) => wrapSelection(ta, v, onChange, '~~', '~~'),
  },
  { separator: true },
  {
    icon: <Heading1 size={14} />,
    title: 'Заголовок 1 (самый крупный)',
    action: (ta, v, onChange) => prefixLine(ta, v, onChange, '# '),
  },
  {
    icon: <Heading2 size={14} />,
    title: 'Заголовок 2 (средний)',
    action: (ta, v, onChange) => prefixLine(ta, v, onChange, '## '),
  },
  {
    icon: <Heading3 size={14} />,
    title: 'Заголовок 3 (небольшой)',
    action: (ta, v, onChange) => prefixLine(ta, v, onChange, '### '),
  },
  { separator: true },
  {
    icon: <List size={14} />,
    title: 'Маркированный список',
    action: (ta, v, onChange) => prefixLine(ta, v, onChange, '- '),
  },
  {
    icon: <ListOrdered size={14} />,
    title: 'Нумерованный список',
    action: (ta, v, onChange) => prefixLine(ta, v, onChange, '1. '),
  },
  {
    icon: <CheckSquare size={14} />,
    title: 'Список с чекбоксами',
    action: (ta, v, onChange) => prefixLine(ta, v, onChange, '- [ ] '),
  },
  { separator: true },
  {
    icon: <Code size={14} />,
    title: 'Вставка кода (Ctrl+`)',
    action: (ta, v, onChange) => wrapSelection(ta, v, onChange, '`', '`'),
  },
  {
    icon: <Quote size={14} />,
    title: 'Цитата (блок текста)',
    action: (ta, v, onChange) => prefixLine(ta, v, onChange, '> '),
  },
  {
    icon: <Link size={14} />,
    title: 'Добавить гиперссылку',
    action: (ta, v, onChange) => {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.slice(start, end);
      const text = selected || 'ссылка';
      const replacement = `[${text}](url)`;
      const newValue = v.slice(0, start) + replacement + v.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.focus();
        // Select 'url' so user can type the URL
        const urlStart = start + text.length + 3;
        ta.setSelectionRange(urlStart, urlStart + 3);
      });
    },
  },
  {
    icon: <Minus size={14} />,
    title: 'Разделительная линия (HR)',
    action: (ta, v, onChange) => insertAtCursor(ta, v, onChange, '\n---\n'),
  },
];

/** Simple markdown to HTML renderer (subset) */
function renderMarkdown(md: string): string {
  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr/>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold & italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Checkbox items
  html = html.replace(
    /^- \[x\] (.+)$/gm,
    '<div class="md-check md-check--done">☑ $1</div>'
  );
  html = html.replace(
    /^- \[ \] (.+)$/gm,
    '<div class="md-check">☐ $1</div>'
  );

  // Unordered list items
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  // Ordered list items
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Links [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Paragraphs — wrap standalone lines in <p>
  html = html.replace(/^(?!<[a-z])(.*\S.*)$/gm, '<p>$1</p>');

  return html;
}

export function ReadmeEditor({ value, onChange }: ReadmeEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b') {
          e.preventDefault();
          wrapSelection(ta, value, onChange, '**', '**');
        } else if (e.key === 'i') {
          e.preventDefault();
          wrapSelection(ta, value, onChange, '_', '_');
        } else if (e.key === '`') {
          e.preventDefault();
          wrapSelection(ta, value, onChange, '`', '`');
        }
      }
      // Tab support for indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newValue = value.slice(0, start) + '  ' + value.slice(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(start + 2, start + 2);
        });
      }
    },
    [value, onChange]
  );

  const charCount = value.length;
  const lineCount = value ? value.split('\n').length : 0;

  return (
    <div className="readme-card">
      <div className="readme-card__header">
        <h2>
          <FileText size={18} />
          Заметки к поставке
        </h2>
        <div className="readme-card__actions">
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => onChange('')}
            data-tooltip="Очистить всё содержимое"
            disabled={!value}
            style={{ 
              opacity: value ? 1 : 0, 
              pointerEvents: value ? 'auto' : 'none',
              transition: 'opacity 0.2s ease'
            }}
          >
            <Eraser size={14} />
          </button>
          <button
            className={`readme-card__preview-btn ${showPreview ? 'readme-card__preview-btn--active' : ''}`}
            onClick={() => setShowPreview(!showPreview)}
            data-tooltip={showPreview ? 'Вернуться к редактированию' : 'Показать предпросмотр'}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {!showPreview && (
        <div className="readme-card__toolbar">
          {TOOLBAR_ITEMS.map((item, i) => {
            if ('separator' in item && item.separator) {
              return <div key={i} className="readme-card__toolbar-sep" />;
            }
            const action = item as MdAction;
            return (
              <button
                key={i}
                className="readme-card__toolbar-btn"
                data-tooltip={action.title}
                onMouseDown={(e) => e.preventDefault()} // keep focus in textarea
                onClick={() => {
                  const ta = textareaRef.current;
                  if (ta) action.action(ta, value, onChange);
                }}
              >
                {action.icon}
              </button>
            );
          })}
        </div>
      )}

      {showPreview ? (
        <div
          className="readme-card__preview"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value || '*Пусто — начните писать...*') }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          className="readme-card__textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Опишите изменения, версию, автора…&#10;&#10;Поддерживается **Markdown**: # заголовки, **жирный**, _курсив_, `код`, списки и др."
          rows={8}
          spellCheck={false}
        />
      )}

      {!showPreview && (
        <div className="readme-card__status">
          <span className="readme-card__hint" style={{ marginRight: 'auto' }}>
            Будет включён в архив как README.txt
          </span>
          <div style={{ display: 'flex', gap: '12px', visibility: value.length > 0 ? 'visible' : 'hidden' }}>
            <span>{lineCount} строк</span>
            <span>{charCount} символов</span>
          </div>
        </div>
      )}
    </div>
  );
}
