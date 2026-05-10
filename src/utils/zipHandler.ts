/**
 * Модуль импорта / экспорта ZIP-архивов и .guf файлов.
 * Использует jszip для работы с архивами и file-saver для скачивания.
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { FileRow } from '../types';
import { parseFileName, getExtension, getNameWithoutExtension, getBaseName } from './nameCleaner';
import { applyTemplate } from './templateEngine';

/**
 * Генерирует уникальный ID строки
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Распаковывает ZIP-файл и возвращает массив FileRow.
 * Поддерживает вложенные папки.
 * По умолчанию показывает только .guf файлы, но можно отключить фильтрацию.
 */
export async function extractZip(
  file: File,
  filterGuf: boolean = true,
  startOrder: number = 1
): Promise<FileRow[]> {
  const zip = await JSZip.loadAsync(file);
  const rows: FileRow[] = [];
  let order = startOrder;

  const entries: { path: string; zipObj: JSZip.JSZipObject }[] = [];

  zip.forEach((relativePath, zipObj) => {
    // Пропускаем директории
    if (zipObj.dir) return;
    entries.push({ path: relativePath, zipObj });
  });

  // Сортируем по имени для предсказуемого порядка
  entries.sort((a, b) => a.path.localeCompare(b.path));

  for (const { path, zipObj } of entries) {
    const baseName = getBaseName(path);
    const ext = getExtension(baseName);

    // Фильтрация по расширению
    if (filterGuf && ext !== 'guf') continue;

    const nameWithoutExt = getNameWithoutExtension(baseName);
    const parsed = parseFileName(nameWithoutExt);
    const blob = await zipObj.async('blob');

    const row: FileRow = {
      id: generateId(),
      order,
      originalPath: path,
      originalName: baseName,
      extension: ext,
      file: blob,
      detectedDate: parsed.detectedDate,
      detectedTime: parsed.detectedTime,
      cleanName: parsed.cleanName,
      variables: {},
      newName: '', // Будет рассчитано после
    };

    rows.push(row);
    order++;
  }

  return rows;
}

/**
 * Конвертирует массив .guf File-объектов в FileRow[].
 * Используется при прямой загрузке файлов без ZIP-обёртки.
 * startOrder — с какого порядкового номера начинать (для добавления к существующим).
 */
export function gufFilesToRows(files: File[], startOrder: number = 1): FileRow[] {
  return files.map((file, i) => {
    const baseName = file.name;
    const ext = getExtension(baseName);
    const nameWithoutExt = getNameWithoutExtension(baseName);
    const parsed = parseFileName(nameWithoutExt);

    return {
      id: generateId(),
      order: startOrder + i,
      originalPath: baseName,
      originalName: baseName,
      extension: ext,
      file,
      detectedDate: parsed.detectedDate,
      detectedTime: parsed.detectedTime,
      cleanName: parsed.cleanName,
      variables: {},
      newName: '',
    };
  });
}

/**
 * Создаёт ZIP-архив с переименованными файлами и инициирует скачивание.
 * Если передан readmeContent — включает README.txt в архив.
 */
export async function generateZip(
  files: FileRow[],
  template: string,
  archiveName: string = 'renamed_files.zip',
  readmeContent?: string
): Promise<void> {
  const zip = new JSZip();

  for (const file of files) {
    // Пересчитываем имя на случай если оно не актуально
    const finalName = applyTemplate(template, file);
    zip.file(finalName, file.file);
  }

  // Добавить README.txt если есть содержимое
  if (readmeContent && readmeContent.trim().length > 0) {
    zip.file('README.txt', readmeContent);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  saveAs(blob, archiveName);
}
