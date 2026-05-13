import { type ReactNode, memo, forwardRef } from 'react';
import './Island.css';

interface IslandProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  flex?: boolean;
}

export const Island = Object.assign(
  memo(({ children, className = '', style, flex = true }: IslandProps) => {
    const flexClass = flex ? 'ui-island--flex' : '';
    return (
      <div className={`ui-island ${flexClass} ${className}`} style={style}>
        {children}
      </div>
    );
  }),
  {
    ScrollArea: memo(forwardRef<HTMLDivElement, { children: ReactNode; className?: string; style?: React.CSSProperties }>(
      ({ children, className = '', style }, ref) => (
        <div ref={ref} className={`ui-island__scroll custom-scrollbar ${className}`} style={style}>
          {children}
        </div>
      )
    )),
  }
);

Island.displayName = 'Island';
Object.assign(Island.ScrollArea, { displayName: 'Island.ScrollArea' });
