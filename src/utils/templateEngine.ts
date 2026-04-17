/**
 * Движок шаблонов для формирования нового имени файла.
 *
 * Поддержка тегов:
 *   {index}, {indexPad6}, {originalName}, {extension},
 *   {date}, {time}, {cleanName}, {prefix}, {module},
 *   {code}, {docNumber}, {custom1}, {custom2}
 */

import type { FileRow } from '../types';

/**
 * Применяет шаблон к строке FileRow и возвращает итоговое имя файла.
 * Расширение добавляется автоматически после шаблона.
 */
export function applyTemplate(template: string, row: FileRow): string {
  const indexStr = String(row.order);
  const indexPad6 = indexStr.padStart(6, '0');

  const replacements: Record<string, string> = {
    '{index}': indexStr,
    '{indexPad6}': indexPad6,
    '{originalName}': row.originalName,
    '{extension}': row.extension,
    '{date}': row.detectedDate,
    '{time}': row.detectedTime,
    '{cleanName}': row.cleanName,
    '{prefix}': row.prefix,
    '{module}': row.module,
    '{code}': row.code,
    '{docNumber}': row.docNumber,
    '{custom1}': row.custom1,
    '{custom2}': row.custom2,
  };

  let result = template;
  for (const [tag, value] of Object.entries(replacements)) {
    result = result.replaceAll(tag, value);
  }

  // Добавить расширение, если оно есть
  if (row.extension) {
    result = `${result}.${row.extension}`;
  }

  return result;
}

/**
 * Пересчитывает newName для всех строк массива.
 * Полезно при изменении шаблона или порядка файлов.
 * @param startNumber — номер, с которого начинается нумерация (по умолчанию 1)
 */
export function recalculateAllNames(
  files: FileRow[],
  template: string,
  startNumber: number = 1
): FileRow[] {
  return files.map((row, idx) => ({
    ...row,
    order: startNumber + idx,
    newName: applyTemplate(template, { ...row, order: startNumber + idx }),
  }));
}
