/**
 * Инспектор SQL — чистый logic-layer для форматирования и анализа SQL.
 *
 * Не использует DOM, localStorage или React.
 * Не выполняет SQL и не подключается к базе.
 */

import type {
  SqlInspectionResult,
  SqlRiskLevel,
  SqlStatementType,
  SqlValidationIssue,
  SqlValidationSeverity,
} from '../types/sqlInspector';

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

const KEYWORDS_UPPERCASE = [
  'SELECT',
  'FROM',
  'WHERE',
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'FULL JOIN',
  'CROSS JOIN',
  'JOIN',
  'ON',
  'GROUP BY',
  'ORDER BY',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'UPDATE',
  'SET',
  'INSERT INTO',
  'VALUES',
  'DELETE FROM',
  'RETURNING',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'CREATE TABLE',
  'CREATE INDEX',
  'CREATE VIEW',
  'CREATE OR REPLACE',
  'ALTER TABLE',
  'DROP TABLE',
  'DROP INDEX',
  'DROP VIEW',
  'TRUNCATE TABLE',
  'TRUNCATE',
  'WITH',
  'AS',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'UNION',
  'UNION ALL',
  'INTERSECT',
  'EXCEPT',
  'IN',
  'NOT IN',
  'EXISTS',
  'NOT EXISTS',
  'IS NULL',
  'IS NOT NULL',
  'AND',
  'OR',
];

const NEWLINE_BEFORE_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'FULL JOIN',
  'CROSS JOIN',
  'JOIN',
  'GROUP BY',
  'ORDER BY',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'UPDATE',
  'SET',
  'INSERT INTO',
  'VALUES',
  'DELETE FROM',
  'RETURNING',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'CREATE TABLE',
  'CREATE INDEX',
  'CREATE VIEW',
  'CREATE OR REPLACE',
  'ALTER TABLE',
  'DROP TABLE',
  'DROP INDEX',
  'DROP VIEW',
  'TRUNCATE TABLE',
  'TRUNCATE',
  'WITH',
  'UNION',
  'UNION ALL',
  'INTERSECT',
  'EXCEPT',
];

const INDENT_KEYWORDS = ['AND', 'OR'];

/**
 * Делит SQL на segments quoted/unquoted, чтобы не трогать single quotes
 * и PostgreSQL dollar-quoted strings.
 */
interface SqlSegment {
  text: string;
  quoted: boolean;
}

function getDollarQuoteDelimiter(sql: string, offset: number): string | null {
  const match = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(offset));
  return match?.[0] ?? null;
}

function splitQuotedSegments(sql: string): SqlSegment[] {
  const segments: SqlSegment[] = [];
  let current = '';
  let mode: 'unquoted' | 'single' | 'dollar' = 'unquoted';
  let dollarDelimiter: string | null = null;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (mode === 'single') {
      if (ch === "'" && sql[i + 1] === "'") {
        current += "''";
        i += 1;
        continue;
      }

      current += ch;
      if (ch === "'") {
        segments.push({ text: current, quoted: true });
        current = '';
        mode = 'unquoted';
      }
      continue;
    }

    if (mode === 'dollar') {
      if (dollarDelimiter && sql.startsWith(dollarDelimiter, i)) {
        current += dollarDelimiter;
        segments.push({ text: current, quoted: true });
        current = '';
        mode = 'unquoted';
        i += dollarDelimiter.length - 1;
        dollarDelimiter = null;
        continue;
      }

      current += ch;
      continue;
    }

    if (ch === "'") {
      if (current.length > 0) {
        segments.push({ text: current, quoted: false });
        current = '';
      }
      current = ch;
      mode = 'single';
      continue;
    }

    if (ch === '$') {
      const delimiter = getDollarQuoteDelimiter(sql, i);
      if (delimiter) {
        if (current.length > 0) {
          segments.push({ text: current, quoted: false });
          current = '';
        }
        current = delimiter;
        mode = 'dollar';
        dollarDelimiter = delimiter;
        i += delimiter.length - 1;
        continue;
      }
    }

    current += ch;
  }

  if (current.length > 0) {
    segments.push({ text: current, quoted: mode !== 'unquoted' });
  }

  return segments;
}

/**
 * Применяет преобразование к unquoted-сегментам, оставляя quoted-сегменты как есть.
 */
function transformUnquoted(sql: string, transform: (chunk: string) => string): string {
  return splitQuotedSegments(sql)
    .map((seg) => (seg.quoted ? seg.text : transform(seg.text)))
    .join('');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeWhitespace(chunk: string): string {
  return chunk.replace(/[\t ]+/g, ' ').replace(/\s*\n\s*/g, '\n');
}

function uppercaseKeywords(chunk: string): string {
  let result = chunk;
  // Длинные keywords раньше коротких (CREATE OR REPLACE раньше CREATE)
  const sorted = [...KEYWORDS_UPPERCASE].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    const pattern = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'gi');
    result = result.replace(pattern, kw);
  }
  return result;
}

function insertNewlines(chunk: string): string {
  let result = chunk;
  const sorted = [...NEWLINE_BEFORE_KEYWORDS].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    const pattern = new RegExp(`\\s*\\b${escapeRegex(kw)}\\b`, 'g');
    result = result.replace(pattern, `\n${kw}`);
  }
  for (const kw of INDENT_KEYWORDS) {
    const pattern = new RegExp(`\\s+\\b${escapeRegex(kw)}\\b`, 'g');
    result = result.replace(pattern, `\n  ${kw}`);
  }
  return result;
}

/* ---------------------------------------------------------------------------
 * Public API: formatter
 * ------------------------------------------------------------------------- */

/**
 * Базовый SQL formatter без сторонних зависимостей.
 * Делает практичное форматирование: uppercase keywords, переносы по ключевым словам.
 */
export function formatSql(sql: string): string {
  const trimmed = sql.trim();
  if (!trimmed) return '';

  // Разделяем по ; на отдельные statement-ы (вне кавычек)
  const statements = splitStatements(trimmed);
  const formatted = statements
    .map((stmt) => formatSingleStatement(stmt))
    .filter((s) => s.length > 0)
    .join(';\n\n');

  return formatted.endsWith(';') ? formatted : `${formatted};`;
}

function splitStatements(sql: string): string[] {
  const result: string[] = [];
  const segments = splitQuotedSegments(sql);
  let buffer = '';

  for (const seg of segments) {
    if (seg.quoted) {
      buffer += seg.text;
      continue;
    }

    let chunk = seg.text;
    let semiIndex = chunk.indexOf(';');
    while (semiIndex !== -1) {
      buffer += chunk.slice(0, semiIndex);
      const trimmed = buffer.trim();
      if (trimmed) result.push(trimmed);
      buffer = '';
      chunk = chunk.slice(semiIndex + 1);
      semiIndex = chunk.indexOf(';');
    }
    buffer += chunk;
  }

  const tail = buffer.trim();
  if (tail) result.push(tail);
  return result;
}

function formatSingleStatement(stmt: string): string {
  let result = stmt;
  result = transformUnquoted(result, normalizeWhitespace);
  result = transformUnquoted(result, uppercaseKeywords);
  result = transformUnquoted(result, insertNewlines);
  // Убираем ведущие пустые строки/пробелы
  result = result
    .split('\n')
    .map((line) => line.replace(/[\t ]+$/g, ''))
    .filter((line, idx) => !(idx === 0 && line.trim() === ''))
    .join('\n')
    .trim();
  return result;
}

/* ---------------------------------------------------------------------------
 * Public API: detection
 * ------------------------------------------------------------------------- */

interface StatementSummary {
  hasSelect: boolean;
  hasInsert: boolean;
  hasUpdate: boolean;
  hasDelete: boolean;
  hasDdl: boolean;
  count: number;
  comments: string[];
}

function summarizeStatements(sql: string): StatementSummary {
  const summary: StatementSummary = {
    hasSelect: false,
    hasInsert: false,
    hasUpdate: false,
    hasDelete: false,
    hasDdl: false,
    count: 0,
    comments: [],
  };

  const stripped = stripComments(sql, summary.comments);
  const statements = splitStatements(stripped);
  for (const raw of statements) {
    const stmt = raw.trim();
    if (!stmt) continue;
    summary.count++;
    if (/^\s*WITH\b/i.test(stmt) || /^\s*SELECT\b/i.test(stmt)) summary.hasSelect = true;
    if (/^\s*INSERT\b/i.test(stmt)) summary.hasInsert = true;
    if (/^\s*UPDATE\b/i.test(stmt)) summary.hasUpdate = true;
    if (/^\s*DELETE\b/i.test(stmt)) summary.hasDelete = true;
    if (/^\s*(CREATE|ALTER|DROP|TRUNCATE)\b/i.test(stmt)) summary.hasDdl = true;
  }
  return summary;
}

function stripComments(sql: string, captured: string[]): string {
  // Удаляет -- комментарии и /* */ комментарии вне кавычек.
  let result = '';
  const segments = splitQuotedSegments(sql);

  for (const seg of segments) {
    if (seg.quoted) {
      result += seg.text;
      continue;
    }

    let text = seg.text;
    // /* */ комментарии (поддерживаются однострочные и многострочные)
    text = text.replace(/\/\*[\s\S]*?\*\//g, (match) => {
      captured.push(match);
      return ' ';
    });
    // -- комментарии до конца строки
    text = text.replace(/--[^\n]*/g, (match) => {
      captured.push(match);
      return '';
    });
    result += text;
  }

  return result;
}

export function detectSqlStatementType(sql: string): SqlStatementType {
  const trimmed = sql.trim();
  if (!trimmed) return 'unknown';

  const summary = summarizeStatements(trimmed);
  const distinctTypes = [
    summary.hasSelect,
    summary.hasInsert,
    summary.hasUpdate,
    summary.hasDelete,
    summary.hasDdl,
  ].filter(Boolean).length;

  if (summary.count === 0) return 'unknown';

  // Datafix detection: данные изменяются + есть упоминание datafix/rollback в комментариях
  const commentBlob = summary.comments.join('\n').toLowerCase();
  const hasDatafixHint = /\b(datafix|rollback|hotfix|patch)\b/.test(commentBlob);
  if (
    hasDatafixHint &&
    (summary.hasUpdate || summary.hasDelete || summary.hasInsert)
  ) {
    return 'datafix';
  }

  if (distinctTypes > 1) return 'mixed';
  if (summary.hasDdl) return 'ddl';
  if (summary.hasSelect) return 'select';
  if (summary.hasInsert) return 'insert';
  if (summary.hasUpdate) return 'update';
  if (summary.hasDelete) return 'delete';
  return 'unknown';
}

/* ---------------------------------------------------------------------------
 * Public API: validation
 * ------------------------------------------------------------------------- */

interface RuleContext {
  rawSql: string;
  trimmed: string;
  withoutComments: string;
  comments: string[];
  upperNoComments: string;
}

function makeContext(sql: string): RuleContext {
  const trimmed = sql.trim();
  const comments: string[] = [];
  const withoutComments = stripComments(trimmed, comments);
  return {
    rawSql: sql,
    trimmed,
    withoutComments,
    comments,
    upperNoComments: withoutComments.toUpperCase(),
  };
}

function issue(
  id: string,
  severity: SqlValidationSeverity,
  title: string,
  message: string,
  suggestion?: string,
): SqlValidationIssue {
  return { id, severity, title, message, suggestion };
}

export function validateSql(sql: string): SqlValidationIssue[] {
  const ctx = makeContext(sql);
  const issues: SqlValidationIssue[] = [];

  // --- Errors / danger ---
  if (!ctx.trimmed) {
    issues.push(
      issue(
        'empty-sql',
        'error',
        'Пустой SQL',
        'Скрипт не содержит SQL.',
        'Введите SQL для анализа.',
      ),
    );
    return issues;
  }

  if (!ctx.withoutComments.trim()) {
    issues.push(
      issue(
        'comments-only',
        'error',
        'Только комментарии',
        'Скрипт состоит только из комментариев и не содержит SQL.',
        'Добавьте SQL-инструкции для выполнения.',
      ),
    );
    return issues;
  }

  const statements = splitStatements(ctx.withoutComments);
  const upperStatements = statements.map((s) => s.toUpperCase());

  for (let i = 0; i < statements.length; i++) {
    const upper = upperStatements[i];

    if (/^\s*DELETE\b/.test(upper) && !/\bWHERE\b/.test(upper)) {
      issues.push(
        issue(
          `delete-without-where-${i}`,
          'error',
          'DELETE без WHERE',
          'DELETE без условия удалит все строки таблицы.',
          'Добавьте WHERE с явным условием перед выполнением.',
        ),
      );
    }

    if (/^\s*UPDATE\b/.test(upper) && !/\bWHERE\b/.test(upper)) {
      issues.push(
        issue(
          `update-without-where-${i}`,
          'error',
          'UPDATE без WHERE',
          'UPDATE без условия обновит все строки таблицы.',
          'Добавьте WHERE с явным условием перед выполнением.',
        ),
      );
    }

    if (/\bDROP\s+TABLE\b/.test(upper)) {
      issues.push(
        issue(
          `drop-table-${i}`,
          'error',
          'DROP TABLE',
          'Скрипт удаляет таблицу. Это необратимо без бэкапа.',
          'Убедитесь, что есть актуальный бэкап и подтверждение от ответственного.',
        ),
      );
    }

    if (/\bTRUNCATE\s+TABLE\b/.test(upper) || /^\s*TRUNCATE\b/.test(upper)) {
      issues.push(
        issue(
          `truncate-${i}`,
          'error',
          'TRUNCATE TABLE',
          'TRUNCATE очищает таблицу полностью без возможности отката средствами триггеров.',
          'Используйте DELETE с условием или подтвердите бэкап перед выполнением.',
        ),
      );
    }

    if (/\bALTER\s+TABLE\b[\s\S]*\bDROP\s+COLUMN\b/.test(upper)) {
      issues.push(
        issue(
          `drop-column-${i}`,
          'error',
          'ALTER TABLE DROP COLUMN',
          'Скрипт удаляет колонку из таблицы. Данные в колонке будут потеряны.',
          'Сохраните данные колонки и убедитесь, что она не используется приложением.',
        ),
      );
    }

    // --- Warnings ---
    if (/^\s*SELECT\s+\*/.test(upper)) {
      issues.push(
        issue(
          `select-star-${i}`,
          'warning',
          'SELECT *',
          'SELECT * возвращает все колонки и может тянуть лишние данные.',
          'Перечислите нужные колонки явно.',
        ),
      );
    }

    if (
      /^\s*INSERT\s+INTO\s+[\w."]+\s+VALUES\b/.test(upper) &&
      !/INSERT\s+INTO\s+[\w."]+\s*\(/.test(upper)
    ) {
      issues.push(
        issue(
          `insert-without-columns-${i}`,
          'warning',
          'INSERT без списка колонок',
          'INSERT без явного списка колонок ломается при изменении схемы.',
          'Перечислите колонки в INSERT INTO table (col1, col2) VALUES (...).',
        ),
      );
    }

    if (
      (/^\s*UPDATE\b/.test(upper) || /^\s*DELETE\b/.test(upper)) &&
      !/\bRETURNING\b/.test(upper)
    ) {
      issues.push(
        issue(
          `no-returning-${i}`,
          'warning',
          'Нет RETURNING',
          'UPDATE / DELETE без RETURNING не возвращает изменённые строки для проверки.',
          'Добавьте RETURNING id или RETURNING *, чтобы видеть, что было изменено.',
        ),
      );
    }

    if (/\bWHERE\s+1\s*=\s*1\b/.test(upper)) {
      issues.push(
        issue(
          `where-1-1-${i}`,
          'warning',
          'WHERE 1=1',
          'WHERE 1=1 эквивалентно отсутствию условия и обработает все строки.',
          'Замените на содержательное условие.',
        ),
      );
    }

    if (
      (/^\s*UPDATE\b/.test(upper) || /^\s*DELETE\b/.test(upper)) &&
      /\bWHERE\b/.test(upper) &&
      !/\b(ID|UUID|GUID|PK|PRIMARY)\b/.test(upper)
    ) {
      issues.push(
        issue(
          `no-key-in-where-${i}`,
          'warning',
          'Нет ключа в WHERE',
          'UPDATE / DELETE не использует id / uuid / точный ключ.',
          'Используйте id или другой уникальный ключ для адресной правки.',
        ),
      );
    }
  }

  if (statements.length > 1) {
    issues.push(
      issue(
        'multiple-statements',
        'warning',
        'Несколько SQL-инструкций',
        'Скрипт содержит несколько statement-ов. Убедитесь, что порядок выполнения и rollback продуманы.',
        'По возможности разделяйте на отдельные скрипты или оборачивайте в BEGIN/COMMIT.',
      ),
    );
  }

  const isDatafixLike = upperStatements.some(
    (s) => /^\s*(UPDATE|DELETE|INSERT)\b/.test(s),
  );
  if (
    isDatafixLike &&
    !/\bBEGIN\b/.test(ctx.upperNoComments) &&
    !/\bCOMMIT\b/.test(ctx.upperNoComments)
  ) {
    issues.push(
      issue(
        'no-transaction',
        'warning',
        'Нет BEGIN / COMMIT',
        'Datafix-подобный скрипт не обёрнут в транзакцию.',
        'Оберните скрипт в BEGIN; ... COMMIT; для атомарности.',
      ),
    );
  }

  const commentBlob = ctx.comments.join('\n').toLowerCase();
  if (
    isDatafixLike &&
    !/\b(rollback|откат)\b/.test(commentBlob) &&
    !/\bROLLBACK\b/.test(ctx.upperNoComments)
  ) {
    issues.push(
      issue(
        'no-rollback-section',
        'warning',
        'Нет rollback-секции',
        'В скрипте нет блока или комментария с rollback-инструкцией.',
        'Добавьте комментарий или отдельный блок с rollback-шагами.',
      ),
    );
  }

  if (/\b(TODO|FIXME)\b/i.test(ctx.comments.join('\n'))) {
    issues.push(
      issue(
        'todo-fixme',
        'warning',
        'TODO / FIXME в комментариях',
        'В SQL остались отметки TODO или FIXME.',
        'Уберите их или замените на финальный комментарий.',
      ),
    );
  }

  // --- Info ---
  const hasUpdateOrDelete = upperStatements.some(
    (s) => /^\s*(UPDATE|DELETE)\b/.test(s),
  );
  const hasPreviewSelect = upperStatements.some((s) => /^\s*SELECT\b/.test(s));
  if (hasUpdateOrDelete && !hasPreviewSelect) {
    issues.push(
      issue(
        'preview-select',
        'info',
        'Preview SELECT',
        'Перед UPDATE/DELETE полезно сделать SELECT с тем же WHERE для проверки.',
        'Добавьте SELECT * FROM ... WHERE ... перед изменениями.',
      ),
    );
  }

  if (
    isDatafixLike &&
    !/(task|задача|tk-|tk_|jira|#\d+)/i.test(ctx.comments.join('\n'))
  ) {
    issues.push(
      issue(
        'task-reference',
        'info',
        'Ссылка на задачу',
        'Не нашли в комментариях ссылку на задачу или тикет.',
        'Добавьте комментарий с номером задачи для отслеживания.',
      ),
    );
  }

  if (
    isDatafixLike &&
    !/\bROLLBACK\b/i.test(ctx.upperNoComments) &&
    !/\b(rollback|откат)\b/i.test(commentBlob)
  ) {
    issues.push(
      issue(
        'rollback-section-info',
        'info',
        'Rollback section',
        'Можно добавить отдельный блок с готовым rollback-скриптом.',
        'Опишите rollback в комментарии или отдельным statement-ом.',
      ),
    );
  }

  if (
    upperStatements.some((s) => /^\s*(UPDATE|DELETE|INSERT)\b/.test(s)) &&
    !/\bRETURNING\s+ID\b/.test(ctx.upperNoComments)
  ) {
    issues.push(
      issue(
        'returning-id',
        'info',
        'RETURNING id',
        'Полезно возвращать id изменённых строк для логов и аудита.',
        'Добавьте RETURNING id или RETURNING *.',
      ),
    );
  }

  return issues;
}

/* ---------------------------------------------------------------------------
 * Public API: risk level
 * ------------------------------------------------------------------------- */

export function calculateSqlRiskLevel(issues: SqlValidationIssue[]): SqlRiskLevel {
  if (issues.some((i) => i.severity === 'error')) return 'danger';
  if (issues.some((i) => i.severity === 'warning')) return 'warning';
  return 'safe';
}

/* ---------------------------------------------------------------------------
 * Public API: rollback
 * ------------------------------------------------------------------------- */

export function generateRollbackTemplate(sql: string): string {
  const type = detectSqlStatementType(sql);

  switch (type) {
    case 'update':
      return [
        '-- Rollback template for UPDATE',
        '-- 1. Before execution, save current values:',
        'SELECT *',
        'FROM <table>',
        'WHERE <same condition>;',
        '',
        '-- 2. Restore values manually:',
        'UPDATE <table>',
        "SET <column> = '<old_value>'",
        "WHERE id = '<id>';",
        '',
      ].join('\n');

    case 'delete':
      return [
        '-- Rollback template for DELETE',
        '-- Before execution, export rows that will be deleted:',
        'SELECT *',
        'FROM <table>',
        'WHERE <same condition>;',
        '',
        '-- Rollback requires INSERT backup based on exported rows.',
        '',
      ].join('\n');

    case 'insert':
      return [
        '-- Rollback template for INSERT',
        'DELETE FROM <table>',
        'WHERE id IN (...);',
        '',
      ].join('\n');

    case 'select':
      return '-- SELECT query does not require rollback.\n';

    case 'ddl':
      return [
        '-- DDL rollback must be prepared manually.',
        '-- Review schema changes before execution.',
        '',
      ].join('\n');

    case 'datafix':
      return [
        '-- Rollback template for datafix',
        '-- 1. Prepare backup SELECT before execution.',
        '-- 2. Wrap script into BEGIN; ... COMMIT;',
        '-- 3. Use RETURNING to log affected ids.',
        '',
      ].join('\n');

    case 'mixed':
    case 'unknown':
    default:
      return '-- Rollback must be prepared manually for mixed or unknown SQL scripts.\n';
  }
}

/* ---------------------------------------------------------------------------
 * Public API: report
 * ------------------------------------------------------------------------- */

const STATEMENT_TYPE_LABELS: Record<SqlStatementType, string> = {
  select: 'SELECT',
  insert: 'INSERT',
  update: 'UPDATE',
  delete: 'DELETE',
  ddl: 'DDL',
  datafix: 'DATAFIX',
  mixed: 'MIXED',
  unknown: 'UNKNOWN',
};

const RISK_LEVEL_LABELS: Record<SqlRiskLevel, string> = {
  safe: 'safe',
  warning: 'warning',
  danger: 'danger',
};

const SEVERITY_LABELS: Record<SqlValidationSeverity, string> = {
  error: 'error',
  warning: 'warning',
  info: 'info',
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function generateSqlReport(
  result: Omit<SqlInspectionResult, 'reportMarkdown'>,
): string {
  const lines: string[] = [];

  lines.push('# SQL Inspection Report');
  lines.push('');
  lines.push(`Type: ${STATEMENT_TYPE_LABELS[result.statementType]}`);
  lines.push(`Risk: ${RISK_LEVEL_LABELS[result.riskLevel]}`);
  lines.push(`Inspected at: ${formatTimestamp(result.inspectedAt)}`);
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (result.issues.length === 0) {
    lines.push('Нет замечаний.');
  } else {
    for (const issue of result.issues) {
      lines.push(`- [${SEVERITY_LABELS[issue.severity]}] ${issue.title}`);
      lines.push(`  ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`  Suggestion: ${issue.suggestion}`);
      }
    }
  }
  lines.push('');
  lines.push('## Formatted SQL');
  lines.push('');
  lines.push('```sql');
  lines.push(result.formattedSql || '-- empty --');
  lines.push('```');
  lines.push('');
  lines.push('## Rollback Template');
  lines.push('');
  lines.push('```sql');
  lines.push(result.rollbackTemplate.trimEnd());
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

/* ---------------------------------------------------------------------------
 * Public API: inspectSql (composition)
 * ------------------------------------------------------------------------- */

export function inspectSql(sql: string): SqlInspectionResult {
  const inspectedAt = Date.now();
  const formattedSql = formatSql(sql);
  const statementType = detectSqlStatementType(sql);
  const issues = validateSql(sql);
  const riskLevel = calculateSqlRiskLevel(issues);
  const rollbackTemplate = generateRollbackTemplate(sql);

  const partial: Omit<SqlInspectionResult, 'reportMarkdown'> = {
    rawSql: sql,
    formattedSql,
    statementType,
    riskLevel,
    issues,
    rollbackTemplate,
    inspectedAt,
  };
  const reportMarkdown = generateSqlReport(partial);

  return { ...partial, reportMarkdown };
}
