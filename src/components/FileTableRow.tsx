import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Check, X, ArrowRight } from 'lucide-react';
import type { FileRow } from '../types';

interface FileTableRowProps {
  row: FileRow;
  hasError: boolean;
  onCleanNameChange?: (fileId: string, cleanName: string) => void;
}

export function FileTableRow({ row, hasError, onCleanNameChange }: FileTableRowProps) {
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
    zIndex: isDragging ? 10 : undefined,
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
      {/* Left: drag handle + order */}
      <div className="file-item__handle" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </div>

      <div className="file-item__order">{row.order}</div>

      {/* Center: file info */}
      <div className="file-item__body">
        {/* Top line: original name + extension */}
        <div className="file-item__original">
          <span className="file-item__original-name" title={row.originalName}>
            {row.originalName}
          </span>
        </div>

        {/* Clean name (editable) */}
        <div className="file-item__clean">
          {isEditing ? (
            <div className="inline-edit">
              <input
                ref={inputRef}
                className="inline-edit__input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={confirmEdit}
              />
              <button
                className="inline-edit__btn inline-edit__btn--confirm"
                onMouseDown={(e) => { e.preventDefault(); confirmEdit(); }}
                title="Подтвердить"
              >
                <Check size={13} />
              </button>
              <button
                className="inline-edit__btn inline-edit__btn--cancel"
                onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }}
                title="Отмена"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="inline-edit-display" onClick={startEditing} title="Нажмите для редактирования описания">
              <span className="inline-edit-display__text">{row.cleanName}</span>
              <Pencil size={11} className="inline-edit-display__icon" />
            </div>
          )}
        </div>

        {/* Bottom line: result */}
        <div className="file-item__result">
          <ArrowRight size={12} className="file-item__arrow" />
          <span className="file-item__new-name" title={row.newName}>
            {row.newName}
          </span>
        </div>
      </div>
    </div>
  );
}
