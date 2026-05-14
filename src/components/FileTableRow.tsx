import { useState, useRef, useEffect, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Check, X, Trash2 } from 'lucide-react';
import type { FileRow } from '../types';

// --- UI-Kit Imports ---
import { IconButton, Input } from '../ui';

interface FileTableRowProps {
  row: FileRow;
  hasError: boolean;
  onCleanNameChange?: (fileId: string, cleanName: string) => void;
  onRemove?: (fileId: string) => void;
}

export const FileTableRow = memo(({ row, hasError, onCleanNameChange, onRemove }: FileTableRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(row.cleanName);
  const inputRef = useRef<HTMLInputElement>(null);

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
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    setEditValue(row.cleanName);
    setIsEditing(true);
  };

  const confirmEdit = () => {
    if (editValue.trim() && onCleanNameChange) {
      onCleanNameChange(row.id, editValue.trim());
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditValue(row.cleanName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') confirmEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`file-item ${hasError ? 'file-item--error' : ''} ${isDragging ? 'file-item--dragging' : ''}`}
    >
      <div className="file-item__handle" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </div>

      <div className="file-item__order">{row.order}</div>

      <div className="file-item__clean">
        {isEditing ? (
          <div className="inline-edit">
            <div style={{ flex: 1 }}>
              <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={confirmEdit}
                noContainer
                style={{ height: '32px', fontSize: '13px' }}
              />
            </div>
            <IconButton
              variant="primary"
              size="sm"
              onMouseDown={(e) => { e.preventDefault(); confirmEdit(); }}
              icon={<Check size={14} />}
              label="Confirm"
              style={{ width: '32px', height: '32px', padding: 0 }}
            />
            <IconButton
              variant="secondary"
              size="sm"
              onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }}
              icon={<X size={14} />}
              label="Cancel"
              style={{ width: '32px', height: '32px', padding: 0 }}
            />
          </div>
        ) : (
          <div className="inline-edit-display" onClick={startEditing} title="Нажмите для редактирования описания">
            <span className="inline-edit-display__text">{row.cleanName}</span>
            <Pencil size={11} className="inline-edit-display__icon" />
          </div>
        )}
      </div>

      <div className="file-item__new-name" title={row.newName}>
        {row.newName}
      </div>

      {onRemove && (
        <IconButton
          className="file-item__delete"
          variant="ghost"
          size="sm"
          icon={<Trash2 size={14} />}
          label="Удалить файл"
          onClick={() => onRemove(row.id)}
          title="Удалить файл"
        />
      )}
    </div>
  );
});

FileTableRow.displayName = 'FileTableRow';
