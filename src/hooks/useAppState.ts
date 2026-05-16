/**
 * Хук глобального состояния приложения.
 * Управляет массивом файлов, шаблоном, ошибками валидации.
 * Полное состояние (включая файлы) сохраняется в IndexedDB
 * и восстанавливается при перезагрузке страницы.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { FileRow, CustomVariable, ValidationError } from '../types';
import { DEFAULT_TEMPLATE, DEFAULT_VARIABLES } from '../types';
import { recalculateAllNames } from '../utils/templateEngine';
import { validateFiles } from '../utils/validation';
import { extractZip, generateZip, gufFilesToRows } from '../utils/zipHandler';
import { saveState, loadState, clearState } from '../utils/persistence';
import { parseFileName, getExtension, getNameWithoutExtension } from '../utils/nameCleaner';

export interface TemplatePreset { id: string; name: string; template: string; updatedAt: number; }

export interface AppState {
  files: FileRow[];
  template: string;
  startNumber: number;
  variables: CustomVariable[];
  readmeContent: string;
  errors: ValidationError[];
  isLoading: boolean;
  isExporting: boolean;
  archiveName: string;
  isRestoring: boolean;

  loadZip: (file: File) => Promise<void>;
  loadGufFiles: (files: File[]) => void;
  addFiles: (files: File[]) => void;
  setTemplate: (tpl: string) => void;
  resetTemplate: () => void;
  setStartNumber: (num: number) => void;
  setVariableValue: (key: string, value: string) => void;
  addVariable: (key: string, label: string) => void;
  removeVariable: (key: string) => void;
  updateFileCleanName: (fileId: string, cleanName: string) => void;
  updateFileDescription: (fileId: string, description: string) => void;
  setReadmeContent: (content: string) => void;
  reorderFiles: (fromIndex: number, toIndex: number) => void;
  removeFile: (fileId: string) => void;
  removeFiles: (fileIds: string[]) => void;
  exportZip: () => Promise<void>;
  clearFiles: () => void;
  hasErrors: boolean;
  errorFileIds: Set<string>;
  duplicateFileIds: Set<string>;
  templatePresets: TemplatePreset[];
  savePreset: (name: string) => void;
  deletePreset: (id: string) => void;
  loadPreset: (id: string) => void;
}

type LegacyFileRow = Partial<FileRow> & Record<string, unknown>;

export function useAppState(): AppState {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [template, setTemplateRaw] = useState<string>(DEFAULT_TEMPLATE);
  const [startNumber, setStartNumberRaw] = useState<number>(1);
  const [variables, setVariables] = useState<CustomVariable[]>([...DEFAULT_VARIABLES]);
  const [readmeContent, setReadmeContentRaw] = useState<string>('');
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
          // Migrate old format: convert per-file fields to variables
          const migratedFiles = saved.files.map((f: LegacyFileRow) => {
            if (f.variables) return f as FileRow;
            // Old format — migrate
            const vars: Record<string, string> = {};
            for (const key of ['prefix', 'module', 'code', 'docNumber', 'custom1', 'custom2']) {
              if (typeof f[key] === 'string') vars[key] = f[key];
            }
            return { ...f, variables: vars } as FileRow;
          });
          setFiles(migratedFiles);
          setTemplateRaw(saved.template);
          setStartNumberRaw(saved.startNumber);
          setArchiveName(saved.archiveName);
          if (saved.variables) {
            setVariables(saved.variables);
          } else if (saved.fieldValues) {
            // Migrate old fieldValues to new variables format
            const migrated: CustomVariable[] = Object.entries(saved.fieldValues).map(
              ([key, value]) => ({
                key,
                label: key.charAt(0).toUpperCase() + key.slice(1),
                value: value as string,
              })
            );
            setVariables(migrated.length > 0 ? migrated : [...DEFAULT_VARIABLES]);
          }
          if (saved.readmeContent) {
            setReadmeContentRaw(saved.readmeContent);
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
      saveState({ files, template, startNumber, archiveName, variables, readmeContent });
    }, 300);
    return () => clearTimeout(timer);
  }, [files, template, startNumber, archiveName, variables, readmeContent]);

  // Пересчёт имён
  const recalc = useCallback(
    (currentFiles: FileRow[], tpl: string, start: number, vars: CustomVariable[]): FileRow[] => {
      return recalculateAllNames(currentFiles, tpl, start, vars);
    },
    []
  );

  // Загрузка ZIP
  const loadZip = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        const rows = await extractZip(file, true);
        
        setFiles((prev) => {
          const startOrder = prev.length + 1;
          const withVars = rows.map((r, i) => ({
            ...r,
            order: startOrder + i,
            variables: r.variables || {},
          }));
          return recalc([...prev, ...withVars], template, startNumber, variables);
        });

        const baseName = file.name.replace(/\.zip$/i, '');
        // Обновляем имя архива только если оно стандартное
        setArchiveName((prev) => (prev === 'renamed_files.zip' ? `${baseName}_renamed.zip` : prev));
      } finally {
        setIsLoading(false);
      }
    },
    [template, startNumber, variables, recalc]
  );

  // Загрузка .guf файлов напрямую (без ZIP)
  const loadGufFiles = useCallback(
    (newFiles: File[]) => {
      setFiles((prev) => {
        const startOrder = prev.length + 1;
        const newRows = gufFilesToRows(newFiles, startOrder);
        return recalc([...prev, ...newRows], template, startNumber, variables);
      });
      // Имя архива по умолчанию если ещё не задано
      setArchiveName((prev) => (prev === 'renamed_files.zip' ? 'guf_pack.zip' : prev));
    },
    [template, startNumber, variables, recalc]
  );

  // Добавление отдельных файлов (не из ZIP)
  const addFiles = useCallback(
    (newFiles: File[]) => {
      setFiles((prev) => {
        const startOrder = prev.length;
        const newRows: FileRow[] = newFiles.map((file, i) => {
          const name = file.name;
          const ext = getExtension(name);
          const nameWithoutExt = getNameWithoutExtension(name);
          const parsed = parseFileName(nameWithoutExt);

          return {
            id: crypto.randomUUID(),
            order: startOrder + i + 1,
            originalPath: name,
            originalName: name,
            extension: ext,
            file: file,
            detectedDate: parsed.detectedDate,
            detectedTime: parsed.detectedTime,
            cleanName: parsed.cleanName,
            variables: {},
            newName: '',
            description: '',
          };
        });
        return recalc([...prev, ...newRows], template, startNumber, variables);
      });
    },
    [template, startNumber, variables, recalc]
  );

  // Установка шаблона
  const setTemplate = useCallback(
    (tpl: string) => {
      setTemplateRaw(tpl);
      setFiles((prev) => recalc(prev, tpl, startNumber, variables));
    },
    [recalc, startNumber, variables]
  );

  // Сброс шаблона к дефолтному
  const resetTemplate = useCallback(() => {
    setTemplateRaw(DEFAULT_TEMPLATE);
    setFiles((prev) => recalc(prev, DEFAULT_TEMPLATE, startNumber, variables));
  }, [recalc, startNumber, variables]);

  // Установка стартового номера
  const setStartNumber = useCallback(
    (num: number) => {
      const safeNum = Math.max(0, Math.floor(num));
      setStartNumberRaw(safeNum);
      setFiles((prev) => recalc(prev, template, safeNum, variables));
    },
    [recalc, template, variables]
  );

  // Изменение значения переменной
  const setVariableValue = useCallback(
    (key: string, value: string) => {
      const nextVariables = variables.map((v) => (v.key === key ? { ...v, value } : v));
      setVariables(nextVariables);
      setFiles((prev) => recalc(prev, template, startNumber, nextVariables));
    },
    [recalc, startNumber, template, variables]
  );

  // Добавление новой переменной
  const addVariable = useCallback(
    (key: string, label: string) => {
      if (variables.some((v) => v.key === key)) return;
      const nextVariables = [...variables, { key, label, value: '' }];
      setVariables(nextVariables);
      setFiles((prev) => recalc(prev, template, startNumber, nextVariables));
    },
    [recalc, startNumber, template, variables]
  );

  // Удаление переменной
  const removeVariable = useCallback(
    (key: string) => {
      const nextVariables = variables.filter((v) => v.key !== key);
      setVariables(nextVariables);
      setFiles((prev) => recalc(prev, template, startNumber, nextVariables));
    },
    [recalc, startNumber, template, variables]
  );

  // Переименование cleanName для конкретного файла
  const updateFileCleanName = useCallback(
    (fileId: string, cleanName: string) => {
      setFiles((prev) => {
        const updated = prev.map((f) => (f.id === fileId ? { ...f, cleanName } : f));
        return recalculateAllNames(updated, template, startNumber, variables);
      });
    },
    [template, startNumber, variables]
  );

  const updateFileDescription = useCallback(
    (fileId: string, description: string) => {
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, description } : f)));
    },
    []
  );

  // Установка readme
  const setReadmeContent = useCallback((content: string) => {
    setReadmeContentRaw(content);
  }, []);

  // Drag-and-drop reorder
  const reorderFiles = useCallback(
    (fromIndex: number, toIndex: number) => {
      setFiles((prev) => {
        const arr = [...prev];
        const [moved] = arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, moved);
        return recalc(arr, template, startNumber, variables);
      });
    },
    [template, startNumber, variables, recalc]
  );

  // Удаление одного файла
  const removeFile = useCallback(
    (fileId: string) => {
      setFiles((prev) => {
        const filtered = prev.filter((f) => f.id !== fileId);
        return recalc(filtered, template, startNumber, variables);
      });
    },
    [template, startNumber, variables, recalc]
  );

  // Экспорт ZIP
  const exportZip = useCallback(async () => {
    setIsExporting(true);
    try {
      const descs = files.filter((f) => (f.description || '').trim()).map((f) => `${f.newName}.${f.extension}: ${(f.description || '').trim()}`);
      const descSection = descs.length > 0 ? '--- Описание файлов ---\n' + descs.join('\n') + '\n\n' : '';
      const fullReadme = descSection + readmeContent;
      await generateZip(files, template, archiveName, fullReadme);
    } finally {
      setIsExporting(false);
    }
  }, [files, template, archiveName, readmeContent]);

  // Очистка
  const clearFiles = useCallback(() => {
    setFiles([]);
    setVariables([...DEFAULT_VARIABLES]);
    setReadmeContentRaw('');
    clearState();
  }, []);

  // Валидация
  const errors = useMemo(() => validateFiles(files), [files]);
  const hasErrors = errors.length > 0;
  const errorFileIds = useMemo(() => new Set(errors.map((e) => e.fileId)), [errors]);

  // Детект дубликатов новых имён
  const duplicateFileIds = useMemo(() => {
    const keyToFirstId = new Map<string, string>();
    const dupes = new Set<string>();
    for (const f of files) {
      const k = `${f.newName}.${f.extension}`.toLowerCase();
      const firstId = keyToFirstId.get(k);
      if (firstId !== undefined) {
        dupes.add(firstId);
        dupes.add(f.id);
      } else {
        keyToFirstId.set(k, f.id);
      }
    }
    return dupes;
  }, [files]);

  // Template presets (localStorage)
  const PRESETS_KEY = 'gd-helper-template-presets';
  const [templatePresets, setTemplatePresets] = useState<TemplatePreset[]>(() => {
    try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); }
    catch { return []; }
  });

  const savePreset = useCallback((name: string) => {
    setTemplatePresets((prev) => {
      const next = [...prev, { id: crypto.randomUUID(), name, template, updatedAt: Date.now() }];
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
      return next;
    });
  }, [template]);

  const deletePreset = useCallback((id: string) => {
    setTemplatePresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const loadPreset = useCallback((id: string) => {
    const preset = templatePresets.find((p) => p.id === id);
    if (preset) {
      setTemplate(preset.template);
    }
  }, [setTemplate, templatePresets]);

  // Batch remove
  const removeFiles = useCallback((fileIds: string[]) => {
    setFiles((prev) => {
      const filtered = prev.filter((f) => !fileIds.includes(f.id));
      return recalc(filtered, template, startNumber, variables);
    });
  }, [recalc, startNumber, template, variables]);

  return {
    files,
    template,
    startNumber,
    variables,
    readmeContent,
    errors,
    isLoading,
    isExporting,
    archiveName,
    isRestoring,
    loadZip,
    loadGufFiles,
    addFiles,
    setTemplate,
    resetTemplate,
    setStartNumber,
    setVariableValue,
    addVariable,
    removeVariable,
    updateFileCleanName,
    updateFileDescription,
    setReadmeContent,
    reorderFiles,
    removeFile,
    exportZip,
    clearFiles,
    hasErrors,
    errorFileIds,
    duplicateFileIds,
    templatePresets,
    savePreset,
    deletePreset,
    loadPreset,
    removeFiles,
  };
}
