import { type ElementType, type ReactNode, memo, forwardRef } from 'react';
import './Island.css';

interface IslandProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  flex?: boolean;
  as?: ElementType;
}

export const Island = Object.assign(
  memo(({ children, className = '', style, flex = true, as: Component = 'div' }: IslandProps) => {
    const flexClass = flex ? 'ui-island--flex' : '';
    return (
      <Component className={`ui-island ${flexClass} ${className}`} style={style}>
        {children}
      </Component>
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
