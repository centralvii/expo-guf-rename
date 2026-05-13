import { type ElementType, type HTMLAttributes, type ReactNode, memo } from 'react';
import { Island } from './Island';
import './Panel.css';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
  flex?: boolean;
  as?: ElementType;
}

export const Panel = memo(({ children, padded = true, flex = false, as, className = '', ...props }: PanelProps) => (
  <Island
    as={as}
    flex={flex}
    className={`ui-panel ${padded ? 'ui-panel--padded' : ''} ${className}`}
    {...props}
  >
    {children}
  </Island>
));

Panel.displayName = 'Panel';

export interface SectionHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  count?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  surface?: boolean;
}

export const SectionHeader = memo(({
  title,
  description,
  eyebrow,
  count,
  icon,
  actions,
  surface = false,
  className = '',
  ...props
}: SectionHeaderProps) => (
  <header className={`ui-section-header ${surface ? 'ui-section-header--surface' : ''} ${className}`} {...props}>
    <div className="ui-section-header__main">
      {eyebrow && <span className="ui-section-header__eyebrow">{eyebrow}</span>}
      <div className="ui-section-header__title-row">
        {icon && <span className="ui-section-header__icon">{icon}</span>}
        <h3 className="ui-section-header__title">{title}</h3>
        {count !== undefined && <span className="ui-section-header__count">{count}</span>}
      </div>
      {description && <p className="ui-section-header__desc">{description}</p>}
    </div>
    {actions && <div className="ui-section-header__actions">{actions}</div>}
  </header>
));

SectionHeader.displayName = 'SectionHeader';

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export const PageHeader = memo(({ title, description, actions, className = '', ...props }: PageHeaderProps) => (
  <header className={`ui-page-header ${className}`} {...props}>
    <div className="ui-page-header__main">
      <h1 className="ui-page-header__title">{title}</h1>
      {description && <p className="ui-page-header__desc">{description}</p>}
    </div>
    {actions && <div className="ui-page-header__actions">{actions}</div>}
  </header>
));

PageHeader.displayName = 'PageHeader';
