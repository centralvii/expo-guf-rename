import { type HTMLAttributes, type ReactNode, memo } from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '../Button/Button';
import './Feedback.css';

export interface LoaderProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Loader = memo(({ label, size = 'md', className = '', ...props }: LoaderProps) => {
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 32 : 24;

  return (
    <div className={`ui-loader ui-loader--${size} ${className}`} {...props}>
      <Loader2 size={iconSize} className="animate-spin" />
      {label && <span className="ui-loader__label">{label}</span>}
    </div>
  );
});

Loader.displayName = 'Loader';

export interface InlineErrorProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: ReactNode;
  icon?: ReactNode;
}

export const InlineError = memo(({ title, message, icon, className = '', ...props }: InlineErrorProps) => (
  <div className={`ui-inline-error ${className}`} role="alert" {...props}>
    <span className="ui-inline-error__icon">{icon ?? <AlertCircle size={16} />}</span>
    <span className="ui-inline-error__content">
      {title && <strong className="ui-inline-error__title">{title}</strong>}
      <span className="ui-inline-error__message">{message}</span>
    </span>
  </div>
));

InlineError.displayName = 'InlineError';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export const EmptyState = memo(({ icon, title, description, action, className = '', ...props }: EmptyStateProps) => (
  <div className={`ui-empty-state ${className}`} {...props}>
    {icon !== null && <div className="ui-empty-state__icon">{icon ?? <Inbox size={42} />}</div>}
    {title && <div className="ui-empty-state__title">{title}</div>}
    {description && <div className="ui-empty-state__desc">{description}</div>}
    {action && <div className="ui-empty-state__action">{action}</div>}
  </div>
));

EmptyState.displayName = 'EmptyState';

export interface IconActionProps extends ButtonProps {
  label: string;
}

export const IconAction = memo(({ label, title, ...props }: IconActionProps) => (
  <Button aria-label={label} title={title ?? label} {...props} />
));

IconAction.displayName = 'IconAction';
