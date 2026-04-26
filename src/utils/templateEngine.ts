/**
 * Движок шаблонов для формирования нового имени файла.
 *
 * Встроенные теги:
 *   {index}, {indexPad6}, {originalName}, {extension},
 *   {date}, {time}, {cleanName}
 *
 * Пользовательские теги:
 *   Любой {variableName} — берётся из row.variables
 */

import type { FileRow, CustomVariable } from '../types';

/**
 * Применяет шаблон к строке FileRow и возвращает итоговое имя файла.
 * Расширение добавляется автоматически после шаблона.
 */
export function applyTemplate(template: string, row: FileRow): string {
  const indexStr = String(row.order);
  const indexPad6 = indexStr.padStart(6, '0');

  // Встроенные замены
  const builtins: Record<string, string> = {
    '{index}': indexStr,
    '{indexPad6}': indexPad6,
    '{originalName}': row.originalName,
    '{extension}': row.extension,
    '{date}': row.detectedDate,
    '{time}': row.detectedTime,
    '{cleanName}': row.cleanName,
  };

  let result = template;

  // Применяем встроенные теги
  for (const [tag, value] of Object.entries(builtins)) {
    result = result.replaceAll(tag, value);
  }

  // Применяем пользовательские переменные
  if (row.variables) {
    for (const [key, value] of Object.entries(row.variables)) {
      result = result.replaceAll(`{${key}}`, value);
    }
  }

  // Добавить расширение, если оно есть
  if (row.extension) {
    result = `${result}.${row.extension}`;
  }

  return result;
}

/**
 * Пересчитывает newName для всех строк массива.
 * @param variables — текущие пользовательские переменные
 * @param startNumber — номер, с которого начинается нумерация
 */
export function recalculateAllNames(
  files: FileRow[],
  template: string,
  startNumber: number = 1,
  variables: CustomVariable[] = []
): FileRow[] {
  // Собираем значения переменных в Record
  const varValues: Record<string, string> = {};
  for (const v of variables) {
    varValues[v.key] = v.value;
  }

  return files.map((row, idx) => {
    const mergedVars = { ...varValues, ...row.variables };
    const updatedRow: FileRow = {
      ...row,
      order: startNumber + idx,
      variables: mergedVars,
    };
    return {
      ...updatedRow,
      newName: applyTemplate(template, updatedRow),
    };
  });
}
