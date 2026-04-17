/**
 * Хук глобального состояния приложения.
 * Управляет массивом файлов, шаблоном, ошибками валидации.
 */

import { useState, useCallback, useMemo } from 'react';
import type { FileRow, EditableField, ValidationError } from '../types';
import { DEFAULT_TEMPLATE } from '../types';
import { applyTemplate, recalculateAllNames } from '../utils/templateEngine';
import { validateFiles } from '../utils/validation';
import { extractZip, generateZip } from '../utils/zipHandler';

export interface AppState {
  files: FileRow[];
  template: string;
  errors: ValidationError[];
  isLoading: boolean;
  isExporting: boolean;
  archiveName: string;

  loadZip: (file: File) => Promise<void>;
  setTemplate: (tpl: string) => void;
  resetTemplate: () => void;
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
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [archiveName, setArchiveName] = useState('renamed_files.zip');

  // Пересчёт имён при изменении шаблона или файлов
  const recalc = useCallback(
    (currentFiles: FileRow[], tpl: string): FileRow[] => {
      return recalculateAllNames(currentFiles, tpl);
    },
    []
  );

  // Загрузка ZIP
  const loadZip = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        const rows = await extractZip(file, true);
        const withNames = recalc(rows, template);
        setFiles(withNames);
        // Запоминаем имя исходного архива для генерации нового
        const baseName = file.name.replace(/\.zip$/i, '');
        setArchiveName(`${baseName}_renamed.zip`);
      } finally {
        setIsLoading(false);
      }
    },
    [template, recalc]
  );

  // Установка шаблона
  const setTemplate = useCallback(
    (tpl: string) => {
      setTemplateRaw(tpl);
      setFiles((prev) => recalc(prev, tpl));
    },
    [recalc]
  );

  // Сброс шаблона к дефолтному
  const resetTemplate = useCallback(() => {
    setTemplateRaw(DEFAULT_TEMPLATE);
    setFiles((prev) => recalc(prev, DEFAULT_TEMPLATE));
  }, [recalc]);

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
        return recalc(arr, template);
      });
    },
    [template, recalc]
  );

  // Автоматическое проставление порядковых номеров в docNumber
  const autoNumberDocNumbers = useCallback(() => {
    setFiles((prev) => {
      const updated = prev.map((f, idx) => {
        const newRow = { ...f, docNumber: String(idx + 1) };
        newRow.newName = applyTemplate(template, newRow);
        return newRow;
      });
      return updated;
    });
  }, [template]);

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

  // Валидация (пересчитывается при каждом рендере, но массив ошибок мемоизирован)
  const errors = useMemo(() => validateFiles(files), [files]);
  const hasErrors = errors.length > 0;
  const errorFileIds = useMemo(
    () => new Set(errors.map((e) => e.fileId)),
    [errors]
  );

  return {
    files,
    template,
    errors,
    isLoading,
    isExporting,
    archiveName,
    loadZip,
    setTemplate,
    resetTemplate,
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
