/**
 * Модуль валидации итоговых имен файлов перед экспортом.
 *
 * Проверки:
 *  1. Нет пустых итоговых имён
 *  2. Нет дубликатов
 *  3. Нет запрещённых символов: \ / : * ? " < > |
 *  4. Не потеряно расширение
 */

import type { FileRow, ValidationError } from '../types';

/** Символы, запрещённые в именах файлов */
const FORBIDDEN_CHARS = /[\\/:*?"<>|]/;

/**
 * Валидирует массив файлов и возвращает список ошибок.
 * Пустой массив ошибок = валидация пройдена.
 */
export function validateFiles(files: FileRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenNames = new Map<string, string>(); // lowerName -> fileId

  for (const file of files) {
    const { newName } = file;

    // 1. Проверка на пустое имя
    if (!newName || newName.trim().length === 0) {
      errors.push({
        fileId: file.id,
        type: 'empty',
        message: `Файл #${file.order}: итоговое имя пустое`,
      });
      continue; // остальные проверки бессмысленны
    }

    // 2. Проверка запрещённых символов (проверяем само имя без расширения в конце)
    const nameWithoutExt = newName.lastIndexOf('.') !== -1
      ? newName.slice(0, newName.lastIndexOf('.'))
      : newName;

    if (FORBIDDEN_CHARS.test(nameWithoutExt)) {
      errors.push({
        fileId: file.id,
        type: 'forbidden_chars',
        message: `Файл #${file.order} «${file.originalName}»: имя содержит запрещённые символы (\\/:*?"<>|)`,
      });
    }

    // 3. Проверка расширения
    if (file.extension && !newName.toLowerCase().endsWith(`.${file.extension.toLowerCase()}`)) {
      errors.push({
        fileId: file.id,
        type: 'no_extension',
        message: `Файл #${file.order} «${file.originalName}»: потеряно расширение .${file.extension}`,
      });
    }

    // 4. Проверка дубликатов (нечувствительно к регистру)
    const lowerName = newName.toLowerCase();
    const existingId = seenNames.get(lowerName);
    if (existingId) {
      errors.push({
        fileId: file.id,
        type: 'duplicate',
        message: `Файл #${file.order} «${file.originalName}»: дубликат имени «${newName}»`,
      });
      // Также помечаем дублированный файл, если ещё не помечен
      if (!errors.some(e => e.fileId === existingId && e.type === 'duplicate')) {
        const original = files.find(f => f.id === existingId);
        if (original) {
          errors.push({
            fileId: existingId,
            type: 'duplicate',
            message: `Файл #${original.order} «${original.originalName}»: дубликат имени «${newName}»`,
          });
        }
      }
    } else {
      seenNames.set(lowerName, file.id);
    }
  }

  return errors;
}
