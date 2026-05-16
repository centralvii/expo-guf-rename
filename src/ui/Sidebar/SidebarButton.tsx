import { forwardRef, memo, type ReactNode, type ComponentProps, type ForwardedRef } from 'react';
import { NavLink } from 'react-router-dom';
import './SidebarButton.css';

export interface SidebarButtonBaseProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  open?: boolean;
  disabled?: boolean;
  tag?: string;
  chevron?: ReactNode;
  className?: string;
}

type ButtonModeProps = { as?: 'button'; onClick?: () => void; to?: never };
type LinkModeProps = { as: 'link'; to: string; end?: boolean; onClick?: never };

export type SidebarButtonProps = SidebarButtonBaseProps & (ButtonModeProps | LinkModeProps);

function SidebarButtonInner(
  {
    icon,
    label,
    active = false,
    collapsed = false,
    open = false,
    disabled = false,
    tag,
    chevron,
    className = '',
    ...rest
  }: SidebarButtonProps,
  ref: ForwardedRef<HTMLButtonElement>,
) {
  const classes = [
    'sb-btn',
    active && 'sb-btn--active',
    collapsed && 'sb-btn--collapsed',
    open && 'sb-btn--open',
    disabled && 'sb-btn--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <span className="sb-btn__icon">{icon}</span>
      <span className="sb-btn__label">{label}</span>
      {tag && !collapsed && <span className="sb-btn__tag">{tag}</span>}
      {chevron && <span className="sb-btn__chevron">{chevron}</span>}
    </>
  );

  if (rest.as === 'link' && rest.to) {
    const { to, end, ...linkRest } = rest;
    return (
      <NavLink
        to={to}
        end={end}
        className={classes}
        title={label}
        {...(linkRest as ComponentProps<typeof NavLink>)}
      >
        {content}
      </NavLink>
    );
  }

  const { onClick } = rest;
  return (
    <button
      ref={ref}
      className={classes}
      onClick={onClick}
      title={label}
      disabled={disabled}
    >
      {content}
    </button>
  );
}

export const SidebarButton = memo(forwardRef(SidebarButtonInner));
SidebarButton.displayName = 'SidebarButton';
