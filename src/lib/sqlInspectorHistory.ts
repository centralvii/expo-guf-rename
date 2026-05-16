/**
 * Инспектор SQL — локальная история проверок.
 * Хранится только в localStorage браузера, не уходит на backend.
 */

import type {
  SqlInspectionHistoryEntry,
  SqlInspectionResult,
} from '../types/sqlInspector';

const STORAGE_KEY = 'gd-helper-sql-inspector-history';
const MAX_ENTRIES = 20;
const MAX_RAW_SQL_LENGTH = 8_000;
const MAX_FORMATTED_SQL_LENGTH = 8_000;
const TITLE_LIMIT = 80;

function isHistoryEntry(value: unknown): value is SqlInspectionHistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.statementType === 'string' &&
    typeof v.riskLevel === 'string' &&
    typeof v.rawSql === 'string' &&
    typeof v.formattedSql === 'string' &&
    typeof v.issuesCount === 'number' &&
    typeof v.createdAt === 'number'
  );
}

export function loadSqlInspectionHistory(): SqlInspectionHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = window.localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function saveSqlInspectionHistory(
  entries: SqlInspectionHistoryEntry[],
): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = entries.slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage может быть переполнен — игнорируем тихо
  }
}

function buildTitle(rawSql: string): string {
  const oneLine = rawSql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!oneLine) return 'Empty SQL';
  if (oneLine.length <= TITLE_LIMIT) return oneLine;
  return `${oneLine.slice(0, TITLE_LIMIT - 1)}…`;
}

export function addSqlInspectionHistoryEntry(
  result: SqlInspectionResult,
): SqlInspectionHistoryEntry[] {
  const entry: SqlInspectionHistoryEntry = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `sql-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: buildTitle(result.rawSql),
    statementType: result.statementType,
    riskLevel: result.riskLevel,
    rawSql: result.rawSql.slice(0, MAX_RAW_SQL_LENGTH),
    formattedSql: result.formattedSql.slice(0, MAX_FORMATTED_SQL_LENGTH),
    issuesCount: result.issues.length,
    createdAt: result.inspectedAt,
  };

  const previous = loadSqlInspectionHistory();
  const next = [entry, ...previous].slice(0, MAX_ENTRIES);
  saveSqlInspectionHistory(next);
  return next;
}

export function clearSqlInspectionHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
