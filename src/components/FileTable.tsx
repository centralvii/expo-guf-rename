import { useMemo, useCallback } from 'react';
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
import type { FileRow } from '../types';
import { FileTableRow } from './FileTableRow';

interface FileTableProps {
  files: FileRow[];
  errorFileIds: Set<string>;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onCleanNameChange?: (fileId: string, cleanName: string) => void;
}

export function FileTable({
  files,
  errorFileIds,
  onReorder,
  onCleanNameChange,
}: FileTableProps) {
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

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="table-card">
      <div className="table-wrapper">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <table className="file-table">
              <thead>
                <tr>
                  <th className="th-handle"></th>
                  <th className="th-order">#</th>
                  <th className="th-original">Исходное имя</th>
                  <th className="th-clean">Описание файла</th>
                  <th className="th-ext">Расш.</th>
                  <th className="th-preview">Новое имя</th>
                </tr>
              </thead>
              <tbody>
                {files.map((row) => (
                  <FileTableRow
                    key={row.id}
                    row={row}
                    hasError={errorFileIds.has(row.id)}
                    onCleanNameChange={onCleanNameChange}
                  />
                ))}
              </tbody>
            </table>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
