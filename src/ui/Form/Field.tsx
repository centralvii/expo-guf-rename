import { type HTMLAttributes, type ReactNode, memo } from 'react';
import '../Input/Input.css';
import './Field.css';

export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}

export const Field = memo(({ label, hint, error, children, className = '', ...props }: FieldProps) => (
  <div className={`ui-field ${className}`} {...props}>
    {(label || hint) && (
      <div className="ui-field__head">
        {label && <span className="ui-label">{label}</span>}
        {hint && <span className="ui-field__hint">{hint}</span>}
      </div>
    )}
    {children}
    {error && <span className="ui-input-error-text">{error}</span>}
  </div>
));

Field.displayName = 'Field';
