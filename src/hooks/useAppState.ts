/**
 * Хук глобального состояния приложения.
 * Управляет массивом файлов, шаблоном, ошибками валидации.
 * Полное состояние (включая файлы) сохраняется в IndexedDB
 * и восстанавливается при перезагрузке страницы.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { FileRow, EditableField, ValidationError } from '../types';
import { DEFAULT_TEMPLATE } from '../types';
import { applyTemplate, recalculateAllNames } from '../utils/templateEngine';
import { validateFiles } from '../utils/validation';
import { extractZip, generateZip } from '../utils/zipHandler';
import { saveState, loadState, clearState } from '../utils/persistence';

export interface AppState {
  files: FileRow[];
  template: string;
  startNumber: number;
  errors: ValidationError[];
  isLoading: boolean;
  isExporting: boolean;
  archiveName: string;
  isRestoring: boolean;

  loadZip: (file: File) => Promise<void>;
  setTemplate: (tpl: string) => void;
  resetTemplate: () => void;
  setStartNumber: (num: number) => void;
  updateField: (fileId: string, field: EditableField, value: string) => void;
  massUpdateField: (field: EditableField, value: string) => void;
  reorderFiles: (fromIndex: number, toIndex: number) => void;
  autoNumberDocNumbers: () => void;
  exportZip: () => Promise<void>;
  clearFiles: () => void;
  hasErrors: boolean;
  errorFileIds: Set<string>;
}

export function useAppState(): AppState {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [template, setTemplateRaw] = useState<string>(DEFAULT_TEMPLATE);
  const [startNumber, setStartNumberRaw] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [archiveName, setArchiveName] = useState('renamed_files.zip');
  const [isRestoring, setIsRestoring] = useState(true);

  // Флаг, что первичное восстановление завершено — чтобы не сохранять пустое состояние
  const restoredRef = useRef(false);

  // ---- Восстановление из IndexedDB при первой загрузке ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadState();
        if (saved && !cancelled) {
          setFiles(saved.files);
          setTemplateRaw(saved.template);
          setStartNumberRaw(saved.startNumber);
          setArchiveName(saved.archiveName);
        }
      } catch (err) {
        console.warn('[restore] Ошибка восстановления:', err);
      } finally {
        if (!cancelled) {
          restoredRef.current = true;
          setIsRestoring(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---- Автосохранение при изменении состояния ----
  useEffect(() => {
    if (!restoredRef.current) return; // не сохраняем до завершения восстановления
    const timer = setTimeout(() => {
      saveState({ files, template, startNumber, archiveName });
    }, 300); // debounce 300 мс
    return () => clearTimeout(timer);
  }, [files, template, startNumber, archiveName]);

  // Пересчёт имён
  const recalc = useCallback(
    (currentFiles: FileRow[], tpl: string, start: number): FileRow[] => {
      return recalculateAllNames(currentFiles, tpl, start);
    },
    []
  );

  // Загрузка ZIP
  const loadZip = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        const rows = await extractZip(file, true);
        const withNames = recalc(rows, template, startNumber);
        setFiles(withNames);
        const baseName = file.name.replace(/\.zip$/i, '');
        setArchiveName(`${baseName}_renamed.zip`);
      } finally {
        setIsLoading(false);
      }
    },
    [template, startNumber, recalc]
  );

  // Установка шаблона
  const setTemplate = useCallback(
    (tpl: string) => {
      setTemplateRaw(tpl);
      setFiles((prev) => recalc(prev, tpl, startNumber));
    },
    [recalc, startNumber]
  );

  // Сброс шаблона к дефолтному
  const resetTemplate = useCallback(() => {
    setTemplateRaw(DEFAULT_TEMPLATE);
    setFiles((prev) => recalc(prev, DEFAULT_TEMPLATE, startNumber));
  }, [recalc, startNumber]);

  // Установка стартового номера
  const setStartNumber = useCallback(
    (num: number) => {
      const safeNum = Math.max(0, Math.floor(num));
      setStartNumberRaw(safeNum);
      setFiles((prev) => recalc(prev, template, safeNum));
    },
    [recalc, template]
  );

  // Обновление поля одного файла
  const updateField = useCallback(
    (fileId: string, field: EditableField, value: string) => {
      setFiles((prev) => {
        const updated = prev.map((f) => {
          if (f.id !== fileId) return f;
          const newRow = { ...f, [field]: value };
          newRow.newName = applyTemplate(template, newRow);
          return newRow;
        });
        return updated;
      });
    },
    [template]
  );

  // Массовое обновление поля для всех файлов
  const massUpdateField = useCallback(
    (field: EditableField, value: string) => {
      setFiles((prev) => {
        const updated = prev.map((f) => {
          const newRow = { ...f, [field]: value };
          newRow.newName = applyTemplate(template, newRow);
          return newRow;
        });
        return updated;
      });
    },
    [template]
  );

  // Drag-and-drop reorder
  const reorderFiles = useCallback(
    (fromIndex: number, toIndex: number) => {
      setFiles((prev) => {
        const arr = [...prev];
        const [moved] = arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, moved);
        return recalc(arr, template, startNumber);
      });
    },
    [template, startNumber, recalc]
  );

  // Автоматическое проставление порядковых номеров в docNumber
  const autoNumberDocNumbers = useCallback(() => {
    setFiles((prev) => {
      const updated = prev.map((f, idx) => {
        const newRow = { ...f, docNumber: String(startNumber + idx) };
        newRow.newName = applyTemplate(template, newRow);
        return newRow;
      });
      return updated;
    });
  }, [template, startNumber]);

  // Экспорт ZIP
  const exportZip = useCallback(async () => {
    setIsExporting(true);
    try {
      await generateZip(files, template, archiveName);
    } finally {
      setIsExporting(false);
    }
  }, [files, template, archiveName]);

  // Очистка
  const clearFiles = useCallback(() => {
    setFiles([]);
    clearState(); // Удалить из IndexedDB тоже
  }, []);

  // Валидация
  const errors = useMemo(() => validateFiles(files), [files]);
  const hasErrors = errors.length > 0;
  const errorFileIds = useMemo(
    () => new Set(errors.map((e) => e.fileId)),
    [errors]
  );

  return {
    files,
    template,
    startNumber,
    errors,
    isLoading,
    isExporting,
    archiveName,
    isRestoring,
    loadZip,
    setTemplate,
    resetTemplate,
    setStartNumber,
    updateField,
    massUpdateField,
    reorderFiles,
    autoNumberDocNumbers,
    exportZip,
    clearFiles,
    hasErrors,
    errorFileIds,
  };
}
