/**
 * Хук глобального состояния приложения.
 * Управляет массивом файлов, шаблоном, ошибками валидации.
 * Шаблон и стартовый номер сохраняются в localStorage.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { FileRow, EditableField, ValidationError } from '../types';
import { DEFAULT_TEMPLATE } from '../types';
import { applyTemplate, recalculateAllNames } from '../utils/templateEngine';
import { validateFiles } from '../utils/validation';
import { extractZip, generateZip } from '../utils/zipHandler';

// ---- localStorage keys ----
const LS_KEY_TEMPLATE = 'guf-renamer:template';
const LS_KEY_START_NUMBER = 'guf-renamer:startNumber';

function loadSavedTemplate(): string {
  try {
    return localStorage.getItem(LS_KEY_TEMPLATE) || DEFAULT_TEMPLATE;
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

function loadSavedStartNumber(): number {
  try {
    const val = localStorage.getItem(LS_KEY_START_NUMBER);
    if (val !== null) {
      const num = parseInt(val, 10);
      return Number.isFinite(num) && num >= 0 ? num : 1;
    }
    return 1;
  } catch {
    return 1;
  }
}

export interface AppState {
  files: FileRow[];
  template: string;
  startNumber: number;
  errors: ValidationError[];
  isLoading: boolean;
  isExporting: boolean;
  archiveName: string;

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
  const [template, setTemplateRaw] = useState<string>(loadSavedTemplate);
  const [startNumber, setStartNumberRaw] = useState<number>(loadSavedStartNumber);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [archiveName, setArchiveName] = useState('renamed_files.zip');

  // Сохранение шаблона в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY_TEMPLATE, template);
    } catch { /* ignore quota errors */ }
  }, [template]);

  // Сохранение стартового номера в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY_START_NUMBER, String(startNumber));
    } catch { /* ignore */ }
  }, [startNumber]);

  // Пересчёт имён при изменении шаблона, файлов или стартового номера
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
