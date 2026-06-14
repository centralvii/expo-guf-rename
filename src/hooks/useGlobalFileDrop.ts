/**
 * Глобальный перехват drag-and-drop файлов ОС на уровне window.
 * Используется, чтобы пользователь мог перетащить файлы в любую
 * часть страницы GUF Packer (а не только в dropzone), при этом
 * не ломая внутреннюю сортировку @dnd-kit в таблице файлов.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseGlobalFileDropOptions {
  enabled?: boolean;
  onFiles: (files: File[]) => void;
}

const DRAG_COUNTER_RESET_MS = 150;

export function useGlobalFileDrop({ enabled = true, onFiles }: UseGlobalFileDropOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const counter = useRef(0);
  const resetTimer = useRef<number | null>(null);

  const handleDragEnter = useCallback((e: DragEvent) => {
    if (!enabled) return;
    if (!e.dataTransfer) return;
    const types = Array.from(e.dataTransfer.types || []);
    if (!types.includes('Files')) return;

    counter.current += 1;
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
    setIsDragging(true);
  }, [enabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    if (!enabled) return;
    // relatedTarget === null указывает на выход из окна
    if (e.relatedTarget === null) {
      counter.current = 0;
      setIsDragging(false);
      return;
    }
    counter.current = Math.max(0, counter.current - 1);
    if (counter.current === 0) {
      // страховка: иногда браузер не присылает последний dragleave
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => {
        counter.current = 0;
        setIsDragging(false);
      }, DRAG_COUNTER_RESET_MS);
    }
  }, [enabled]);

  const handleDragOver = useCallback((e: DragEvent) => {
    if (!enabled) return;
    if (!e.dataTransfer) return;
    const types = Array.from(e.dataTransfer.types || []);
    if (!types.includes('Files')) return;
    // Разрешаем drop
    e.preventDefault();
  }, [enabled]);

  const handleDrop = useCallback((e: DragEvent) => {
    if (!enabled) return;
    if (!e.dataTransfer || e.dataTransfer.files.length === 0) return;
    e.preventDefault();
    counter.current = 0;
    setIsDragging(false);
    onFiles(Array.from(e.dataTransfer.files));
  }, [enabled, onFiles]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    };
  }, [enabled, handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return isDragging;
}
