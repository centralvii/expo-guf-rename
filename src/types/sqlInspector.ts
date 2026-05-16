/**
 * Инспектор SQL — типы для локального инструмента форматирования и анализа SQL.
 *
 * Не используется для Task Helper, миграций или выполнения SQL.
 * Все данные обрабатываются только в браузере.
 */

export type SqlStatementType =
  | 'select'
  | 'insert'
  | 'update'
  | 'delete'
  | 'ddl'
  | 'datafix'
  | 'mixed'
  | 'unknown';

export type SqlRiskLevel = 'safe' | 'warning' | 'danger';

export type SqlValidationSeverity = 'error' | 'warning' | 'info';

export interface SqlValidationIssue {
  id: string;
  severity: SqlValidationSeverity;
  title: string;
  message: string;
  line?: number;
  suggestion?: string;
}

export interface SqlInspectionResult {
  rawSql: string;
  formattedSql: string;
  statementType: SqlStatementType;
  riskLevel: SqlRiskLevel;
  issues: SqlValidationIssue[];
  rollbackTemplate: string;
  reportMarkdown: string;
  inspectedAt: number;
}

export interface SqlInspectionHistoryEntry {
  id: string;
  title: string;
  statementType: SqlStatementType;
  riskLevel: SqlRiskLevel;
  rawSql: string;
  formattedSql: string;
  issuesCount: number;
  createdAt: number;
}
