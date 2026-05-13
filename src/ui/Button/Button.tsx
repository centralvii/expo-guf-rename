import { type ButtonHTMLAttributes, type ReactNode, memo } from 'react';
import { Loader2 } from 'lucide-react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  icon?: ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

export const Button = memo(({
  variant = 'secondary',
  size = 'md',
  leftIcon,
  rightIcon,
  icon,
  isLoading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) => {
  const baseClass = 'ui-btn';
  const variantClass = `${baseClass}--${variant}`;
  const sizeClass = `${baseClass}--${size}`;
  const fullWidthClass = fullWidth ? `${baseClass}--full-width` : '';
  const loadingClass = isLoading ? `${baseClass}--loading` : '';

  const resolvedLeftIcon = leftIcon ?? icon;

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${fullWidthClass} ${loadingClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 18} />
      ) : (
        <>
          {resolvedLeftIcon && <span className={`${baseClass}__icon`}>{resolvedLeftIcon}</span>}
          {children && <span className={`${baseClass}__text`}>{children}</span>}
          {rightIcon && <span className={`${baseClass}__icon`}>{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'fullWidth' | 'icon' | 'leftIcon' | 'rightIcon'> {
  icon: ReactNode;
  label: string;
}

export const IconButton = memo(({
  icon,
  label,
  className = '',
  size = 'md',
  ...props
}: IconButtonProps) => (
  <Button
    className={`ui-icon-btn ${className}`}
    size={size}
    aria-label={label}
    title={props.title ?? label}
    {...props}
  >
    <span className="ui-btn__icon">{icon}</span>
  </Button>
));

IconButton.displayName = 'IconButton';
