/**
 * Хук глобального состояния приложения.
 * Управляет массивом файлов, шаблоном, ошибками валидации.
 * Полное состояние (включая файлы) сохраняется в IndexedDB
 * и восстанавливается при перезагрузке страницы.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { FileRow, EditableField, ValidationError } from '../types';
import { DEFAULT_TEMPLATE } from '../types';
import { recalculateAllNames } from '../utils/templateEngine';
import { validateFiles } from '../utils/validation';
import { extractZip, generateZip } from '../utils/zipHandler';
import { saveState, loadState, clearState } from '../utils/persistence';

/** Значения «глобальных» полей для массового заполнения */
export type FieldValues = Record<EditableField, string>;

const EMPTY_FIELDS: FieldValues = {
  prefix: '',
  module: '',
  code: '',
  docNumber: '',
  custom1: '',
  custom2: '',
};

export interface AppState {
  files: FileRow[];
  template: string;
  startNumber: number;
  fieldValues: FieldValues;
  errors: ValidationError[];
  isLoading: boolean;
  isExporting: boolean;
  archiveName: string;
  isRestoring: boolean;

  loadZip: (file: File) => Promise<void>;
  setTemplate: (tpl: string) => void;
  resetTemplate: () => void;
  setStartNumber: (num: number) => void;
  setFieldValue: (field: EditableField, value: string) => void;
  reorderFiles: (fromIndex: number, toIndex: number) => void;
  exportZip: () => Promise<void>;
  clearFiles: () => void;
  hasErrors: boolean;
  errorFileIds: Set<string>;
}

export function useAppState(): AppState {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [template, setTemplateRaw] = useState<string>(DEFAULT_TEMPLATE);
  const [startNumber, setStartNumberRaw] = useState<number>(1);
  const [fieldValues, setFieldValues] = useState<FieldValues>({ ...EMPTY_FIELDS });
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [archiveName, setArchiveName] = useState('renamed_files.zip');
  const [isRestoring, setIsRestoring] = useState(true);

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
          if (saved.fieldValues) {
            setFieldValues(saved.fieldValues);
          }
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
    if (!restoredRef.current) return;
    const timer = setTimeout(() => {
      saveState({ files, template, startNumber, archiveName, fieldValues });
    }, 300);
    return () => clearTimeout(timer);
  }, [files, template, startNumber, archiveName, fieldValues]);

  // Пересчёт имён — применяет шаблон с текущими fieldValues
  const recalc = useCallback(
    (currentFiles: FileRow[], tpl: string, start: number, fv: FieldValues): FileRow[] => {
      // Сначала применить глобальные значения, потом пересчитать имена
      const withFields = currentFiles.map((f) => ({
        ...f,
        prefix: fv.prefix,
        module: fv.module,
        code: fv.code,
        docNumber: fv.docNumber,
        custom1: fv.custom1,
        custom2: fv.custom2,
      }));
      return recalculateAllNames(withFields, tpl, start);
    },
    []
  );

  // Загрузка ZIP
  const loadZip = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        const rows = await extractZip(file, true);
        const withNames = recalc(rows, template, startNumber, fieldValues);
        setFiles(withNames);
        const baseName = file.name.replace(/\.zip$/i, '');
        setArchiveName(`${baseName}_renamed.zip`);
      } finally {
        setIsLoading(false);
      }
    },
    [template, startNumber, fieldValues, recalc]
  );

  // Установка шаблона
  const setTemplate = useCallback(
    (tpl: string) => {
      setTemplateRaw(tpl);
      setFiles((prev) => recalc(prev, tpl, startNumber, fieldValues));
    },
    [recalc, startNumber, fieldValues]
  );

  // Сброс шаблона к дефолтному
  const resetTemplate = useCallback(() => {
    setTemplateRaw(DEFAULT_TEMPLATE);
    setFiles((prev) => recalc(prev, DEFAULT_TEMPLATE, startNumber, fieldValues));
  }, [recalc, startNumber, fieldValues]);

  // Установка стартового номера
  const setStartNumber = useCallback(
    (num: number) => {
      const safeNum = Math.max(0, Math.floor(num));
      setStartNumberRaw(safeNum);
      setFiles((prev) => recalc(prev, template, safeNum, fieldValues));
    },
    [recalc, template, fieldValues]
  );

  // Изменение глобального поля — сразу применяется ко всем файлам
  const setFieldValue = useCallback(
    (field: EditableField, value: string) => {
      setFieldValues((prev) => {
        const newFv = { ...prev, [field]: value };
        // Пересчёт файлов с новыми значениями
        setFiles((prevFiles) => recalc(prevFiles, template, startNumber, newFv));
        return newFv;
      });
    },
    [recalc, template, startNumber]
  );

  // Drag-and-drop reorder
  const reorderFiles = useCallback(
    (fromIndex: number, toIndex: number) => {
      setFiles((prev) => {
        const arr = [...prev];
        const [moved] = arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, moved);
        return recalc(arr, template, startNumber, fieldValues);
      });
    },
    [template, startNumber, fieldValues, recalc]
  );

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
    setFieldValues({ ...EMPTY_FIELDS });
    clearState();
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
    fieldValues,
    errors,
    isLoading,
    isExporting,
    archiveName,
    isRestoring,
    loadZip,
    setTemplate,
    resetTemplate,
    setStartNumber,
    setFieldValue,
    reorderFiles,
    exportZip,
    clearFiles,
    hasErrors,
    errorFileIds,
  };
}
