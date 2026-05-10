import { type TextareaHTMLAttributes, memo } from 'react';
import './Input.css';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Textarea = memo(({
  label,
  error,
  fullWidth = false,
  className = '',
  id,
  ...props
}: TextareaProps) => {
  const containerClass = `ui-input-container ${fullWidth ? 'ui-input-container--full' : ''} ${className}`;
  const inputId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className={containerClass}>
      {label && <label htmlFor={inputId} className="ui-label">{label}</label>}
      <textarea
        id={inputId}
        className={`ui-input ui-textarea custom-scrollbar ${error ? 'ui-input--error' : ''}`}
        {...props}
      />
      {error && <span className="ui-input-error-text">{error}</span>}
    </div>
  );
});

Textarea.displayName = 'Textarea';
