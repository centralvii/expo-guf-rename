/**
 * Утилита персистентности состояния через IndexedDB.
 * Сохраняет метаданные файлов и бинарные Blob-ы отдельно.
 */

import type { FileRow, CustomVariable } from '../types';

const DB_NAME = 'guf-renamer';
const DB_VERSION = 1;
const STORE_META = 'meta';
const STORE_BLOBS = 'blobs';

// ----- Типы -----
export interface PersistedState {
  files: FileRow[];
  template: string;
  startNumber: number;
  archiveName: string;
  variables?: CustomVariable[];
  fieldValues?: Record<string, string>; // backwards compat
  readmeContent?: string;
}

// ----- Открытие БД -----
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ----- Низкоуровневые хелперы -----
function idbPut(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbClear(db: IDBDatabase, store: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ----- Публичное API -----

/**
 * Сохраняет полное состояние приложения в IndexedDB.
 * Метаданные хранятся отдельно от бинарных данных (Blob).
 */
export async function saveState(state: PersistedState): Promise<void> {
  try {
    const db = await openDB();

    // Сохраняем метаданные файлов (без file blob)
    const filesWithoutBlobs = state.files.map((f) => ({
      ...f,
      file: null as unknown as Blob,
    }));

    await idbPut(db, STORE_META, 'state', {
      files: filesWithoutBlobs,
      template: state.template,
      startNumber: state.startNumber,
      archiveName: state.archiveName,
      variables: state.variables,
      readmeContent: state.readmeContent,
    });

    // Очистить старые блобы и записать новые
    await idbClear(db, STORE_BLOBS);
    for (const file of state.files) {
      if (file.file) {
        await idbPut(db, STORE_BLOBS, file.id, file.file);
      }
    }

    db.close();
  } catch (err) {
    console.warn('[persistence] Не удалось сохранить состояние:', err);
  }
}

/**
 * Загружает сохранённое состояние из IndexedDB.
 * Возвращает null если ничего не сохранено.
 */
export async function loadState(): Promise<PersistedState | null> {
  try {
    const db = await openDB();

    const saved = await idbGet<{
      files: FileRow[];
      template: string;
      startNumber: number;
      archiveName: string;
      variables?: CustomVariable[];
      fieldValues?: Record<string, string>;
      readmeContent?: string;
    }>(db, STORE_META, 'state');

    if (!saved || !saved.files || saved.files.length === 0) {
      db.close();
      return null;
    }

    // Восстанавливаем блобы
    const filesWithBlobs: FileRow[] = [];
    for (const file of saved.files) {
      const blob = await idbGet<Blob>(db, STORE_BLOBS, file.id);
      filesWithBlobs.push({
        ...file,
        file: blob || new Blob(),
      });
    }

    db.close();

    return {
      files: filesWithBlobs,
      template: saved.template,
      startNumber: saved.startNumber,
      archiveName: saved.archiveName,
      variables: saved.variables,
      fieldValues: saved.fieldValues,
      readmeContent: saved.readmeContent,
    };
  } catch (err) {
    console.warn('[persistence] Не удалось загрузить состояние:', err);
    return null;
  }
}

/**
 * Очищает сохранённое состояние.
 */
export async function clearState(): Promise<void> {
  try {
    const db = await openDB();
    await idbClear(db, STORE_META);
    await idbClear(db, STORE_BLOBS);
    db.close();
  } catch (err) {
    console.warn('[persistence] Не удалось очистить состояние:', err);
  }
}
