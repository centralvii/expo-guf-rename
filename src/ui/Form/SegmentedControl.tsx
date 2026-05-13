import { type HTMLAttributes, type ReactNode, memo } from 'react';
import './SegmentedControl.css';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

export const SegmentedControl = memo(function SegmentedControl<T extends string = string>({
  value,
  options,
  onChange,
  size = 'md',
  className = '',
  ...props
}: SegmentedControlProps<T>) {
  return (
    <div className={`ui-segmented ui-segmented--${size} ${className}`} {...props}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`ui-segmented__item ${value === option.value ? 'ui-segmented__item--active' : ''}`}
          onClick={() => onChange(option.value)}
          disabled={option.disabled}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}) as <T extends string = string>(props: SegmentedControlProps<T>) => React.JSX.Element;
