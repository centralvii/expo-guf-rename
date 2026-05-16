import { useState, useRef, useEffect, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Check, X, Trash2, FileText } from 'lucide-react';
import type { FileRow } from '../types';
import { Button, IconButton, Input, Modal, Textarea } from '../ui';

interface FileTableRowProps {
  row: FileRow;
  hasError: boolean;
  isDuplicate: boolean;
  onCleanNameChange?: (fileId: string, cleanName: string) => void;
  onDescriptionChange?: (fileId: string, description: string) => void;
  onRemove?: (fileId: string) => void;
}

export const FileTableRow = memo(({ row, hasError, isDuplicate, onCleanNameChange, onDescriptionChange, onRemove }: FileTableRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(row.cleanName);
  const [showDescModal, setShowDescModal] = useState(false);
  const [descValue, setDescValue] = useState(row.description);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => { if (isEditing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [isEditing]);

  const startEditing = () => { setEditValue(row.cleanName); setIsEditing(true); };
  const confirmEdit = () => { if (editValue.trim() && onCleanNameChange) onCleanNameChange(row.id, editValue.trim()); setIsEditing(false); };
  const cancelEdit = () => { setEditValue(row.cleanName); setIsEditing(false); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit(); };

  const openDesc = () => { setDescValue(row.description); setShowDescModal(true); };
  const saveDesc = () => { onDescriptionChange?.(row.id, descValue); setShowDescModal(false); };

  const classNames = [
    'file-item',
    hasError ? 'file-item--error' : '',
    isDuplicate ? 'file-item--duplicate' : '',
    isDragging ? 'file-item--dragging' : '',
  ].filter(Boolean).join(' ');

  return (
    <div ref={setNodeRef} style={style} className={classNames}>
      <div className="file-item__handle" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </div>
      <div className="file-item__order">{row.order}</div>
      <div className="file-item__clean">
        {isEditing ? (
          <div className="inline-edit">
            <div style={{ flex: 1 }}>
              <Input ref={inputRef} sizeVariant="sm" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={handleKeyDown} onBlur={confirmEdit} noContainer />
            </div>
            <IconButton variant="primary" size="sm" onMouseDown={(e) => { e.preventDefault(); confirmEdit(); }} icon={<Check size={14} />} label="Confirm" style={{ width: '32px', height: '32px', padding: 0 }} />
            <IconButton variant="secondary" size="sm" onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }} icon={<X size={14} />} label="Cancel" style={{ width: '32px', height: '32px', padding: 0 }} />
          </div>
        ) : (
          <div className="inline-edit-display" onClick={startEditing} title="Нажмите для редактирования имени файла">
            <span className="inline-edit-display__text">{row.cleanName}</span>
            <Pencil size={11} className="inline-edit-display__icon" />
          </div>
        )}
      </div>
      <div className="file-item__new-name" title={row.newName}>
        {row.newName}
        {isDuplicate && <span className="file-item__dup-badge">дубль</span>}
      </div>
      <div className="file-item__desc-btn-wrap">
        <button className={`file-item__desc-btn ${row.description ? 'file-item__desc-btn--filled' : ''}`} onClick={openDesc} title={row.description || 'Добавить описание'}>
          <FileText size={13} />
        </button>
      </div>
      {onRemove && (
        <IconButton className="file-item__delete" variant="ghost" size="sm" icon={<Trash2 size={14} />} label="Удалить файл" onClick={() => onRemove(row.id)} title="Удалить файл" />
      )}

      <Modal isOpen={showDescModal} onClose={() => setShowDescModal(false)} title="Описание файла">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Textarea value={descValue} onChange={(e) => setDescValue(e.target.value)} placeholder="Опишите, что делает этот файл..." noContainer rows={4} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', lineHeight: 1.6 }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setShowDescModal(false)}>Отмена</Button>
            <Button variant="primary" size="sm" onClick={saveDesc}>Сохранить</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

FileTableRow.displayName = 'FileTableRow';
