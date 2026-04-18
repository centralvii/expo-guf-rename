import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { FileRow } from '../types';

interface FileTableRowProps {
  row: FileRow;
  hasError: boolean;
}

export function FileTableRow({ row, hasError }: FileTableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`file-row ${hasError ? 'file-row--error' : ''} ${isDragging ? 'file-row--dragging' : ''}`}
    >
      {/* Drag handle */}
      <td className="file-row__handle" {...attributes} {...listeners}>
        <GripVertical size={16} />
      </td>

      {/* Order */}
      <td className="file-row__order">{row.order}</td>

      {/* Original name */}
      <td className="file-row__original" title={row.originalName}>
        <span className="file-row__original-text">{row.originalName}</span>
      </td>

      {/* Extension */}
      <td className="file-row__ext">.{row.extension}</td>

      {/* New name preview */}
      <td className="file-row__preview" title={row.newName}>
        <span className="file-row__preview-text">{row.newName}</span>
      </td>
    </tr>
  );
}
