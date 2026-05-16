import { useMemo, useCallback, useRef, useState, memo } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { FileIcon, Plus, AlertTriangle, Copy } from 'lucide-react';
import type { FileRow } from '../types';
import { FileTableRow } from './FileTableRow';
import { Badge, Button, Island, SearchInput } from '../ui';

interface FileTableProps {
  files: FileRow[];
  errorFileIds: Set<string>;
  duplicateFileIds: Set<string>;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onCleanNameChange?: (fileId: string, cleanName: string) => void;
  onDescriptionChange?: (fileId: string, description: string) => void;
  onAddFiles?: (files: File[]) => void;
  onRemoveFile?: (fileId: string) => void;
}

export const FileTable = memo(({ files, errorFileIds, duplicateFileIds, onReorder, onCleanNameChange, onDescriptionChange, onAddFiles, onRemoveFile }: FileTableProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();
    return files.filter((f) =>
      f.originalName.toLowerCase().includes(q) ||
      f.cleanName.toLowerCase().includes(q) ||
      f.newName.toLowerCase().includes(q) ||
      f.extension.toLowerCase().includes(q)
    );
  }, [files, searchQuery]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const fromIndex = files.findIndex((f) => f.id === active.id);
      const toIndex = files.findIndex((f) => f.id === over.id);
      if (fromIndex >= 0 && toIndex >= 0) onReorder(fromIndex, toIndex);
    }
  }, [files, onReorder]);

  const errorCount = errorFileIds.size;
  const duplicateCount = duplicateFileIds.size;

  return (
    <Island className="file-table-card" flex={false}>
      <div className="file-table-card__header">
        <div className="file-table-card__title-row">
          <h2><FileIcon size={18} /> Файлы <Badge variant="accent">{files.length}</Badge></h2>
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Поиск..." wrapperStyle={{ flex: 'none', width: 280 }} />
          <input ref={fileInputRef} type="file" multiple hidden onChange={(e) => { onAddFiles?.(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
          <div style={{ flex: 1, minWidth: 0 }} />
          <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => fileInputRef.current?.click()}>Добавить</Button>
        </div>
      </div>

      <div className="file-table-list custom-scrollbar">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={files.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            {filteredFiles.map((row) => (
              <FileTableRow
                key={row.id}
                row={row}
                hasError={errorFileIds.has(row.id)}
                isDuplicate={duplicateFileIds.has(row.id)}
                onCleanNameChange={onCleanNameChange}
                onDescriptionChange={onDescriptionChange}
                onRemove={onRemoveFile}
              />
            ))}
          </SortableContext>
        </DndContext>
        {filteredFiles.length === 0 && (
          <div className="file-table-card__empty">
            {searchQuery ? 'Ничего не найдено' : 'Нет файлов. Загрузите ZIP или .guf файлы.'}
          </div>
        )}
      </div>

      {(errorCount > 0 || duplicateCount > 0) && (
        <div className="file-table-card__footer">
          {errorCount > 0 && <span className="file-table-card__footer--error"><AlertTriangle size={12} /> {errorCount} ошиб{(errorCount % 10 === 1 && errorCount % 100 !== 11) ? 'ка' : 'ки'}</span>}
          {duplicateCount > 0 && <span className="file-table-card__footer--duplicate"><Copy size={12} /> {duplicateCount} дубликат{(duplicateCount % 10 === 1 && duplicateCount % 100 !== 11) ? '' : 'а'}</span>}
        </div>
      )}
    </Island>
  );
});

FileTable.displayName = 'FileTable';
