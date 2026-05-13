import { useState, useRef, useCallback, memo } from 'react';
import {
  FileText, Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Code, Quote, Link, Minus, Eye, EyeOff,
  CheckSquare, Eraser
} from 'lucide-react';

// --- UI-Kit Imports ---
import { Button, IconButton, Island, Textarea } from '../ui';

interface ReadmeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

type MdAction = {
  icon: React.ReactNode;
  title: string;
  action: (textarea: HTMLTextAreaElement, value: string, onChange: (v: string) => void) => void;
  separator?: false;
};

type MdSeparator = { separator: true };
type ToolbarItem = MdAction | MdSeparator;

function wrapSelection(ta: HTMLTextAreaElement, value: string, onChange: (v: string) => void, before: string, after: string) {
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

function prefixLine(ta: HTMLTextAreaElement, value: string, onChange: (v: string) => void, prefix: string) {
  const start = ta.selectionStart;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  onChange(newValue);
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(start + prefix.length, start + prefix.length);
  });
}

function insertAtCursor(ta: HTMLTextAreaElement, value: string, onChange: (v: string) => void, text: string) {
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
  { icon: <Bold size={14} />, title: 'Bold', action: (ta, v, onChange) => wrapSelection(ta, v, onChange, '**', '**') },
  { icon: <Italic size={14} />, title: 'Italic', action: (ta, v, onChange) => wrapSelection(ta, v, onChange, '_', '_') },
  { icon: <Strikethrough size={14} />, title: 'Strike', action: (ta, v, onChange) => wrapSelection(ta, v, onChange, '~~', '~~') },
  { separator: true },
  { icon: <Heading1 size={14} />, title: 'H1', action: (ta, v, onChange) => prefixLine(ta, v, onChange, '# ') },
  { icon: <Heading2 size={14} />, title: 'H2', action: (ta, v, onChange) => prefixLine(ta, v, onChange, '## ') },
  { icon: <Heading3 size={14} />, title: 'H3', action: (ta, v, onChange) => prefixLine(ta, v, onChange, '### ') },
  { separator: true },
  { icon: <List size={14} />, title: 'List', action: (ta, v, onChange) => prefixLine(ta, v, onChange, '- ') },
  { icon: <ListOrdered size={14} />, title: 'Ordered', action: (ta, v, onChange) => prefixLine(ta, v, onChange, '1. ') },
  { icon: <CheckSquare size={14} />, title: 'Check', action: (ta, v, onChange) => prefixLine(ta, v, onChange, '- [ ] ') },
  { separator: true },
  { icon: <Code size={14} />, title: 'Code', action: (ta, v, onChange) => wrapSelection(ta, v, onChange, '`', '`') },
  { icon: <Quote size={14} />, title: 'Quote', action: (ta, v, onChange) => prefixLine(ta, v, onChange, '> ') },
  { icon: <Link size={14} />, title: 'Link', action: (ta, v, onChange) => {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = v.slice(start, end);
    const text = selected || 'ссылка';
    const replacement = `[${text}](url)`;
    const newValue = v.slice(0, start) + replacement + v.slice(end);
    onChange(newValue);
    requestAnimationFrame(() => { ta.focus(); const urlStart = start + text.length + 3; ta.setSelectionRange(urlStart, urlStart + 3); });
  }},
  { icon: <Minus size={14} />, title: 'HR', action: (ta, v, onChange) => insertAtCursor(ta, v, onChange, '\n---\n') },
];

function renderMarkdown(md: string): string {
  let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/^---$/gm, '<hr/>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^- \[x\] (.+)$/gm, '<div class="md-check md-check--done">☑ $1</div>');
  html = html.replace(/^- \[ \] (.+)$/gm, '<div class="md-check">☐ $1</div>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
  html = html.replace(/^(?!<[a-z])(.*\S.*)$/gm, '<p>$1</p>');
  return html;
}

export const ReadmeEditor = memo(({ value, onChange }: ReadmeEditorProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); wrapSelection(ta, value, onChange, '**', '**'); }
      else if (e.key === 'i') { e.preventDefault(); wrapSelection(ta, value, onChange, '_', '_'); }
      else if (e.key === '`') { e.preventDefault(); wrapSelection(ta, value, onChange, '`', '`'); }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = value.slice(0, start) + '  ' + value.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + 2, start + 2); });
    }
  }, [value, onChange]);

  const charCount = value.length;
  const lineCount = value ? value.split('\n').length : 0;

  return (
    <Island className="readme-card" flex={false}>
      <div className="readme-card__header">
        <h2><FileText size={18} /> Заметки к поставке</h2>
        <div className="readme-card__actions">
          {value && (
            <IconButton variant="ghost" size="sm" onClick={() => onChange('')} icon={<Eraser size={14} />} label="Очистить" />
          )}
          <Button 
            variant={showPreview ? 'primary' : 'ghost'} 
            size="sm" 
            onClick={() => setShowPreview(!showPreview)} 
            icon={showPreview ? <EyeOff size={14} /> : <Eye size={14} />} 
          />
        </div>
      </div>

      {!showPreview && (
        <div className="readme-card__toolbar">
          {TOOLBAR_ITEMS.map((item, i) => {
            if ('separator' in item && item.separator) return <div key={i} className="readme-card__toolbar-sep" />;
            const action = item as MdAction;
            return (
              <IconButton key={i} className="readme-card__toolbar-btn" variant="ghost" size="sm" icon={action.icon} label={action.title} data-tooltip={action.title} onMouseDown={(e) => e.preventDefault()} onClick={() => { const ta = textareaRef.current; if (ta) action.action(ta, value, onChange); }} />
            );
          })}
        </div>
      )}

      {showPreview ? (
        <div className="readme-card__preview custom-scrollbar" dangerouslySetInnerHTML={{ __html: renderMarkdown(value || '*Пусто — начните писать...*') }} />
      ) : (
        <Textarea ref={textareaRef} className="readme-card__textarea custom-scrollbar" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown} placeholder="Markdown поддерживается..." rows={8} spellCheck={false} noContainer />
      )}

      {!showPreview && (
        <div className="readme-card__status">
          <span className="readme-card__hint">Включено как README.txt</span>
          <div className={`readme-card__counters ${value.length > 0 ? 'readme-card__counters--visible' : ''}`}>
            <span>{lineCount} строк</span>
            <span>{charCount} симв.</span>
          </div>
        </div>
      )}
    </Island>
  );
});

ReadmeEditor.displayName = 'ReadmeEditor';
