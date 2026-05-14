import { useMemo, useCallback, useRef, memo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { FileIcon, Plus } from 'lucide-react';
import type { FileRow } from '../types';
import { FileTableRow } from './FileTableRow';

// --- UI-Kit Imports ---
import { Button, Island } from '../ui';

interface FileTableProps {
  files: FileRow[];
  errorFileIds: Set<string>;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onCleanNameChange?: (fileId: string, cleanName: string) => void;
  onAddFiles?: (files: File[]) => void;
  onRemoveFile?: (fileId: string) => void;
}

export const FileTable = memo(({
  files,
  errorFileIds,
  onReorder,
  onCleanNameChange,
  onAddFiles,
  onRemoveFile,
}: FileTableProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const itemIds = useMemo(() => files.map((f) => f.id), [files]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const fromIndex = files.findIndex((f) => f.id === active.id);
      const toIndex = files.findIndex((f) => f.id === over.id);
      if (fromIndex !== -1 && toIndex !== -1) {
        onReorder(fromIndex, toIndex);
      }
    },
    [files, onReorder]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    if (onAddFiles) {
      onAddFiles(Array.from(selectedFiles));
    }
    e.target.value = '';
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <Island className="table-card" flex={false}>
      <div className="table-card__header">
        <h2>
          <FileIcon size={18} />
          Файлы
          <span className="table-card__count">{files.length}</span>
        </h2>
        {onAddFiles && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".guf"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              icon={<Plus size={14} />}
            >
              Добавить файл
            </Button>
          </>
        )}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="file-list">
          <div className="file-list-header">
            <div /> {/* handle */}
            <div className="file-list-header__center">№</div>
            <div>Оригинальное название (описание)</div>
            <div>Итоговое название файла</div>
            <div /> {/* delete */}
          </div>
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {files.map((row) => (
              <FileTableRow
                key={row.id}
                row={row}
                hasError={errorFileIds.has(row.id)}
                onCleanNameChange={onCleanNameChange}
                onRemove={onRemoveFile}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>
    </Island>
  );
});

FileTable.displayName = 'FileTable';
