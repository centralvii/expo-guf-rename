import { type InputHTMLAttributes, memo } from 'react';
import './Checkbox.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = memo(({ label, className = '', ...props }: CheckboxProps) => (
  <label className={`ui-checkbox ${className}`}>
    <input className="ui-checkbox__input" type="checkbox" {...props} />
    {label && <span className="ui-checkbox__label">{label}</span>}
  </label>
));

Checkbox.displayName = 'Checkbox';
