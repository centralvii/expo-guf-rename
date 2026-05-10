/**
 * Утилита кеширования PDF файлов в IndexedDB.
 */

const DB_NAME = 'pdf-viewer-cache';
const DB_VERSION = 1;
const STORE_NAME = 'pdf-blobs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Сохраняет PDF Blob в кеш браузера
 */
export async function cachePdfBlob(docId: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const req = tx.objectStore(STORE_NAME).put(blob, docId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch (err) {
    console.warn('[pdf-cache] Не удалось сохранить файл:', err);
  }
}

/**
 * Получает PDF Blob из кеша
 */
export async function getCachedPdfBlob(docId: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const req = tx.objectStore(STORE_NAME).get(docId);
      req.onsuccess = () => resolve(req.result as Blob || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return blob;
  } catch (err) {
    return null;
  }
}

/**
 * Удаляет файл из кеша
 */
export async function removeFromCache(docId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(docId);
    db.close();
  } catch (err) {}
}
