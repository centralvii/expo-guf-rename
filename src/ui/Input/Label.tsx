import { type ReactNode, memo } from 'react';
import './Input.css';

interface LabelProps {
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}

export const Label = memo(({
  children,
  htmlFor,
  required = false,
  className = ''
}: LabelProps) => {
  return (
    <label htmlFor={htmlFor} className={`ui-label ${className}`}>
      {children}
      {required && <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>}
    </label>
  );
});

Label.displayName = 'Label';
