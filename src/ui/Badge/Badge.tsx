import { type ReactNode, memo } from 'react';
import './Badge.css';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'accent';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

export const Badge = memo(({
  children,
  variant = 'default',
  className = '',
  dot = false
}: BadgeProps) => {
  const baseClass = 'ui-badge';
  const variantClass = `${baseClass}--${variant}`;

  return (
    <span className={`${baseClass} ${variantClass} ${className}`}>
      {dot && <span className={`${baseClass}__dot`} />}
      <span className={`${baseClass}__text`}>{children}</span>
    </span>
  );
});

Badge.displayName = 'Badge';
