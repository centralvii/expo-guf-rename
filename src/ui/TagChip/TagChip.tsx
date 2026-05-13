import { type HTMLAttributes, type MouseEvent } from 'react';
import { X } from 'lucide-react';
import './TagChip.css';

export interface TagChipProps extends HTMLAttributes<HTMLSpanElement> {
  color?: string;
  size?: 'sm' | 'md';
  mono?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
}

export function TagChip({
  color,
  size = 'md',
  mono = false,
  removable = false,
  onRemove,
  removeLabel = 'Remove tag',
  className = '',
  children,
  style,
  ...props
}: TagChipProps) {
  const resolvedStyle = {
    ...style,
    ...(color ? { '--ui-tag-color': color } : {}),
  } as React.CSSProperties;

  return (
    <span
      className={`ui-tag-chip ui-tag-chip--${size} ${mono ? 'ui-tag-chip--mono' : ''} ${className}`}
      style={resolvedStyle}
      {...props}
    >
      <span className="ui-tag-chip__label">{children}</span>
      {removable && onRemove && (
        <button
          type="button"
          className="ui-tag-chip__remove"
          aria-label={removeLabel}
          title={removeLabel}
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
