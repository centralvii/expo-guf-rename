import { type TextareaHTMLAttributes, memo, forwardRef } from 'react';
import './Input.css';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  noContainer?: boolean;
}

export const Textarea = memo(forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  fullWidth = false,
  noContainer = false,
  className = '',
  id,
  ...props
}, ref) => {
  const containerClass = `ui-input-container ${fullWidth ? 'ui-input-container--full' : ''} ${className}`;
  const inputId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const content = (
    <textarea
      id={inputId}
      ref={ref}
      className={`ui-input ui-textarea custom-scrollbar ${error ? 'ui-input--error' : ''} ${noContainer ? className : ''}`}
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
