import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { FileRow, EditableField } from '../types';

interface FileTableRowProps {
  row: FileRow;
  hasError: boolean;
  onFieldChange: (fileId: string, field: EditableField, value: string) => void;
}

const INLINE_FIELDS: { key: EditableField; placeholder: string; width: string }[] = [
  { key: 'prefix', placeholder: 'Префикс', width: '80px' },
  { key: 'module', placeholder: 'Модуль', width: '80px' },
  { key: 'code', placeholder: 'Код', width: '110px' },
  { key: 'docNumber', placeholder: '№ док', width: '70px' },
  { key: 'custom1', placeholder: 'C1', width: '70px' },
  { key: 'custom2', placeholder: 'C2', width: '70px' },
];

export function FileTableRow({ row, hasError, onFieldChange }: FileTableRowProps) {
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

      {/* Clean name */}
      <td className="file-row__clean" title={row.cleanName}>
        <span className="file-row__clean-text">{row.cleanName}</span>
      </td>

      {/* Editable fields */}
      {INLINE_FIELDS.map((field) => (
        <td key={field.key} className="file-row__field">
          <input
            type="text"
            className="inline-input"
            style={{ width: field.width }}
            value={row[field.key]}
            onChange={(e) => onFieldChange(row.id, field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        </td>
      ))}

      {/* New name preview */}
      <td className="file-row__preview" title={row.newName}>
        <span className="file-row__preview-text">{row.newName}</span>
      </td>
    </tr>
  );
}
