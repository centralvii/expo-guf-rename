import { type ReactNode, memo } from 'react';
import './Table.css';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export const Table = Object.assign(
  memo(({ children, className = '' }: TableProps) => {
    return (
      <div className={`ui-table-container ${className}`}>
        <table className="ui-table">
          {children}
        </table>
      </div>
    );
  }),
  {
    Head: memo(({ children }: { children: ReactNode }) => (
      <thead className="ui-table__head">{children}</thead>
    )),
    Body: memo(({ children }: { children: ReactNode }) => (
      <tbody className="ui-table__body">{children}</tbody>
    )),
    Row: memo(({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) => (
      <tr className={`ui-table__row ${onClick ? 'ui-table__row--clickable' : ''} ${className}`} onClick={onClick}>
        {children}
      </tr>
    )),
    HeaderCell: memo(({ children = null, style }: { children?: ReactNode; style?: React.CSSProperties }) => (
      <th className="ui-table__hcell" style={style}>{children}</th>
    )),
    Cell: memo(({ children, style, className = '' }: { children: ReactNode; style?: React.CSSProperties; className?: string }) => (
      <td className={`ui-table__cell ${className}`} style={style}>{children}</td>
    )),
  }
);

Table.displayName = 'Table';
(Table.Head as any).displayName = 'Table.Head';
(Table.Body as any).displayName = 'Table.Body';
(Table.Row as any).displayName = 'Table.Row';
(Table.HeaderCell as any).displayName = 'Table.HeaderCell';
(Table.Cell as any).displayName = 'Table.Cell';
