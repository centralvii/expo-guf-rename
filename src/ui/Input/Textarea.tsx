import { type TextareaHTMLAttributes, memo, forwardRef, useEffect, useRef } from 'react';
import './Input.css';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  noContainer?: boolean;
  autoResize?: boolean;
}

export const Textarea = memo(forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  fullWidth = false,
  noContainer = false,
  autoResize = false,
  className = '',
  id,
  value,
  ...props
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerClass = `ui-input-container ${fullWidth ? 'ui-input-container--full' : ''} ${className}`;
  const inputId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  useEffect(() => {
    if (!autoResize || !textareaRef.current) return;

    const element = textareaRef.current;

    // Сохраняем позиции скролла ДО изменения высоты
    const pageScrollY = window.scrollY;
    const taScrollTop = element.scrollTop;

    // Измеряем истинную высоту контента и применяем
    element.style.height = 'auto';
    const newHeight = element.scrollHeight;
    element.style.height = `${newHeight}px`;

    // Восстанавливаем скролл — предотвращает скачок
    window.scrollTo(window.scrollX, pageScrollY);
    element.scrollTop = taScrollTop;
  }, [autoResize, value]);

  const content = (
    <textarea
      id={inputId}
      ref={(node) => {
        textareaRef.current = node;

        if (!ref) {
          return;
        }

        if (typeof ref === 'function') {
          ref(node);
          return;
        }

        ref.current = node;
      }}
      className={`ui-input ui-textarea ${autoResize ? 'ui-textarea--auto-resize' : ''} custom-scrollbar ${error ? 'ui-input--error' : ''} ${noContainer ? className : ''}`}
      value={value}
      {...props}
    />
  );

  if (noContainer) return content;

  return (
    <div className={containerClass}>
      {label && <label htmlFor={inputId} className="ui-label">{label}</label>}
      {content}
      {error && <span className="ui-input-error-text">{error}</span>}
    </div>
  );
}));

Textarea.displayName = 'Textarea';
