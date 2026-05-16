import { type InputHTMLAttributes, type ReactNode, memo, forwardRef } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  fullWidth?: boolean;
  noContainer?: boolean;
  sizeVariant?: 'sm' | 'md';
}

export const Input = memo(forwardRef<HTMLInputElement, InputProps>(({
  label,
  icon,
  error,
  fullWidth = false,
  noContainer = false,
  sizeVariant = 'md',
  className = '',
  id,
  ...props
}, ref) => {
  const containerClass = `ui-input-container ${fullWidth ? 'ui-input-container--full' : ''} ${className}`;
  const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  const content = (
    <div className="ui-input-wrapper">
      {icon && <span className="ui-input__icon">{icon}</span>}
      <input
        id={inputId}
        ref={ref}
        className={`ui-input ui-input--${sizeVariant} ${icon ? 'ui-input--with-icon' : ''} ${error ? 'ui-input--error' : ''}`}
        {...props}
      />
    </div>
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

Input.displayName = 'Input';
