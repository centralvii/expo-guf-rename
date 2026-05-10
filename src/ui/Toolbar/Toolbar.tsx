import { type ReactNode, memo } from 'react';
import './Toolbar.css';

interface ToolbarProps {
  children: ReactNode;
  className?: string;
}

export const Toolbar = Object.assign(
  memo(({ children, className = '' }: ToolbarProps) => {
    return (
      <header className={`ui-toolbar ${className}`}>
        {children}
      </header>
    );
  }),
  {
    Left: memo(({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) => (
      <div className={`ui-toolbar__left ${className}`} style={style}>{children}</div>
    )),
    Right: memo(({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) => (
      <div className={`ui-toolbar__right ${className}`} style={style}>{children}</div>
    )),
    Divider: memo(() => <div className="ui-toolbar__divider" />),
  }
);

Toolbar.displayName = 'Toolbar';
(Toolbar.Left as any).displayName = 'Toolbar.Left';
(Toolbar.Right as any).displayName = 'Toolbar.Right';
(Toolbar.Divider as any).displayName = 'Toolbar.Divider';
