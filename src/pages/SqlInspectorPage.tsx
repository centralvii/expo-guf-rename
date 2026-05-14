import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Database,
  Download,
  History,
  Info,
  PlayCircle,
  Trash2,
  Wand2,
} from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  Panel,
  PageTitle,
  SectionHeader,
  Textarea,
  Toolbar,
  type BadgeVariant,
} from '../ui';
import { useToast } from '../hooks/useToast';
import {
  inspectSql,
} from '../lib/sqlInspector';
import {
  addSqlInspectionHistoryEntry,
  clearSqlInspectionHistory,
  loadSqlInspectionHistory,
} from '../lib/sqlInspectorHistory';
import type {
  SqlInspectionHistoryEntry,
  SqlInspectionResult,
  SqlRiskLevel,
  SqlStatementType,
  SqlValidationIssue,
  SqlValidationSeverity,
} from '../types/sqlInspector';

import './SqlInspector/SqlInspector.css';

const SAMPLE_SQL = `-- Пример: UPDATE без WHERE будет помечен как danger
-- TASK-1234

UPDATE users
SET status = 'active'
WHERE id = '00000000-0000-0000-0000-000000000000'
RETURNING id;`;

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
  safe: 'Безопасно',
  warning: 'Внимание',
  danger: 'Опасно',
};

const RISK_BADGE_VARIANT: Record<SqlRiskLevel, BadgeVariant> = {
  safe: 'success',
  warning: 'warning',
  danger: 'danger',
};

const SEVERITY_LABELS: Record<SqlValidationSeverity, string> = {
  error: 'Ошибка',
  warning: 'Предупреждение',
  info: 'Подсказка',
};

const SEVERITY_BADGE_VARIANT: Record<SqlValidationSeverity, BadgeVariant> = {
  error: 'danger',
  warning: 'warning',
  info: 'info',
};

/* ---------------- helpers ---------------- */

async function copyText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error('Clipboard API недоступен');
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatHistoryDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ---------------- subcomponents ---------------- */

const RiskMetric = memo(function RiskMetric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sql-metric">
      <span className="sql-metric__label">{label}</span>
      <span className="sql-metric__value">{children}</span>
    </div>
  );
});

const SeverityIcon = memo(function SeverityIcon({
  severity,
}: {
  severity: SqlValidationSeverity;
}) {
  if (severity === 'error') return <AlertCircle size={14} />;
  if (severity === 'warning') return <AlertTriangle size={14} />;
  return <Info size={14} />;
});

const IssueRow = memo(function IssueRow({ issue }: { issue: SqlValidationIssue }) {
  return (
    <li className={`sql-issue sql-issue--${issue.severity}`}>
      <div className="sql-issue__head">
        <span className="sql-issue__icon">
          <SeverityIcon severity={issue.severity} />
        </span>
        <Badge variant={SEVERITY_BADGE_VARIANT[issue.severity]}>
          {SEVERITY_LABELS[issue.severity]}
        </Badge>
        <span className="sql-issue__title">{issue.title}</span>
      </div>
      <p className="sql-issue__message">{issue.message}</p>
      {issue.suggestion && (
        <p className="sql-issue__suggestion">
          <span className="sql-issue__suggestion-label">Совет:</span> {issue.suggestion}
        </p>
      )}
    </li>
  );
});

/* ---------------- page ---------------- */

export function SqlInspectorPage() {
  const { notify } = useToast();
  const [rawSql, setRawSql] = useState<string>('');
  const [result, setResult] = useState<SqlInspectionResult | null>(null);
  const [history, setHistory] = useState<SqlInspectionHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadSqlInspectionHistory());
  }, []);

  const runInspect = useCallback(
    (sql: string, sourceLabel = 'Скрипт проверен') => {
      const trimmed = sql.trim();
      if (!trimmed) {
        notify('Введите SQL для проверки', 'error');
        return;
      }
      const inspection = inspectSql(sql);
      setResult(inspection);
      const updatedHistory = addSqlInspectionHistoryEntry(inspection);
      setHistory(updatedHistory);
      notify(sourceLabel);
    },
    [notify],
  );

  const handleInspect = useCallback(() => {
    runInspect(rawSql);
  }, [rawSql, runInspect]);

  const handleClear = useCallback(() => {
    setRawSql('');
    setResult(null);
    notify('Поле очищено');
  }, [notify]);

  const handleLoadSample = useCallback(() => {
    setRawSql(SAMPLE_SQL);
    notify('Загружен пример SQL');
  }, [notify]);

  const doCopy = useCallback(
    async (text: string, successMessage: string) => {
      try {
        await copyText(text);
        notify(successMessage);
      } catch {
        notify('Не удалось скопировать', 'error');
      }
    },
    [notify],
  );

  const handleCopyFormatted = useCallback(() => {
    if (!result) return;
    void doCopy(result.formattedSql, 'Отформатированный SQL скопирован');
  }, [result, doCopy]);

  const handleCopyRollback = useCallback(() => {
    if (!result) return;
    void doCopy(result.rollbackTemplate, 'Rollback-шаблон скопирован');
  }, [result, doCopy]);

  const handleCopyReport = useCallback(() => {
    if (!result) return;
    void doCopy(result.reportMarkdown, 'Markdown-отчёт скопирован');
  }, [result, doCopy]);

  const handleCopyRaw = useCallback(() => {
    if (!rawSql.trim()) {
      notify('Поле пустое', 'error');
      return;
    }
    void doCopy(rawSql, 'SQL скопирован');
  }, [rawSql, doCopy, notify]);

  const handleDownloadSql = useCallback(() => {
    if (!result) {
      notify('Сначала отформатируйте SQL', 'error');
      return;
    }
    downloadTextFile('inspection.sql', result.formattedSql, 'application/sql');
    notify('Файл .sql скачан');
  }, [result, notify]);

  const handleDownloadReport = useCallback(() => {
    if (!result) {
      notify('Сначала отформатируйте SQL', 'error');
      return;
    }
    downloadTextFile('sql-inspection-report.md', result.reportMarkdown, 'text/markdown');
    notify('Markdown-отчёт скачан');
  }, [result, notify]);

  const handleSelectHistoryEntry = useCallback(
    (entry: SqlInspectionHistoryEntry) => {
      setRawSql(entry.rawSql);
      runInspect(entry.rawSql, 'Загружено из истории');
    },
    [runInspect],
  );

  const handleClearHistory = useCallback(() => {
    clearSqlInspectionHistory();
    setHistory([]);
    notify('История очищена', 'error');
  }, [notify]);

  const issuesByCategory = useMemo(() => {
    if (!result) return { errors: 0, warnings: 0, infos: 0 };
    const errors = result.issues.filter((i) => i.severity === 'error').length;
    const warnings = result.issues.filter((i) => i.severity === 'warning').length;
    const infos = result.issues.filter((i) => i.severity === 'info').length;
    return { errors, warnings, infos };
  }, [result]);

  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content tool-page__content--auto sql-inspector">
        <Toolbar>
          <Toolbar.Left>
            <PageTitle>SQL Inspector</PageTitle>
          </Toolbar.Left>
          <Toolbar.Right>
            <Button
              variant="secondary"
              size="sm"
              icon={<Wand2 size={14} />}
              onClick={handleLoadSample}
            >
              Пример
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<ClipboardCopy size={14} />}
              onClick={handleCopyRaw}
            >
              Копировать SQL
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              onClick={handleDownloadSql}
              disabled={!result}
            >
              Скачать .sql
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={handleClear}
            >
              Очистить
            </Button>
          </Toolbar.Right>
        </Toolbar>

        <div className="sql-grid">
          <Panel className="sql-editor">
            <SectionHeader
              title="Исходный SQL"
              description="Вставьте SQL для форматирования и проверки. Скрипт не выполняется."
              icon={<Database size={16} />}
              actions={
                <Button
                  variant="primary"
                  size="sm"
                  icon={<PlayCircle size={14} />}
                  onClick={handleInspect}
                >
                  Форматировать и проверить
                </Button>
              }
            />
            <Textarea
              value={rawSql}
              onChange={(e) => setRawSql(e.target.value)}
              placeholder="-- Вставьте сюда SQL"
              fullWidth
              spellCheck={false}
              className="sql-editor__textarea-wrap"
              style={{ minHeight: 280, fontFamily: 'var(--font-mono)' }}
            />
          </Panel>

          <Panel className="sql-output">
            <SectionHeader
              title="Отформатированный SQL"
              description="Результат форматирования. Используйте перед копированием в датафикс."
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ClipboardCopy size={14} />}
                  onClick={handleCopyFormatted}
                  disabled={!result}
                >
                  Копировать
                </Button>
              }
            />
            {result ? (
              <pre className="sql-code-block custom-scrollbar">
                <code>{result.formattedSql || '-- empty --'}</code>
              </pre>
            ) : (
              <EmptyState
                description="Запустите форматирование, чтобы увидеть результат."
              />
            )}
          </Panel>
        </div>

        <Panel className="sql-validation">
          <SectionHeader
            title="Проверка"
            description="Анализ SQL по локальным правилам. Подключение к базе не используется."
          />

          <div className="sql-metrics">
            <RiskMetric label="Тип скрипта">
              <Badge variant="default">
                {result ? STATEMENT_TYPE_LABELS[result.statementType] : '—'}
              </Badge>
            </RiskMetric>
            <RiskMetric label="Уровень риска">
              {result ? (
                <Badge variant={RISK_BADGE_VARIANT[result.riskLevel]}>
                  {RISK_LEVEL_LABELS[result.riskLevel]}
                </Badge>
              ) : (
                <Badge variant="default">—</Badge>
              )}
            </RiskMetric>
            <RiskMetric label="Замечаний">
              <span className="sql-metric__count">
                {result ? result.issues.length : 0}
              </span>
            </RiskMetric>
            <RiskMetric label="Распределение">
              <span className="sql-metric__breakdown">
                <Badge variant="danger">{issuesByCategory.errors}</Badge>
                <Badge variant="warning">{issuesByCategory.warnings}</Badge>
                <Badge variant="info">{issuesByCategory.infos}</Badge>
              </span>
            </RiskMetric>
          </div>

          {result ? (
            result.issues.length > 0 ? (
              <ul className="sql-issue-list">
                {result.issues.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} />
                ))}
              </ul>
            ) : (
              <div className="sql-validation__ok">
                <CheckCircle2 size={16} />
                <span>Замечаний нет. SQL прошёл локальные проверки.</span>
              </div>
            )
          ) : (
            <EmptyState description="Запустите проверку, чтобы увидеть замечания." />
          )}
        </Panel>

        <div className="sql-grid sql-grid--secondary">
          <Panel className="sql-rollback">
            <SectionHeader
              title="Rollback-шаблон"
              description="Заготовка для подготовки отката. Не гарантирует автоматический rollback."
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ClipboardCopy size={14} />}
                  onClick={handleCopyRollback}
                  disabled={!result}
                >
                  Копировать
                </Button>
              }
            />
            {result ? (
              <pre className="sql-code-block custom-scrollbar">
                <code>{result.rollbackTemplate.trimEnd()}</code>
              </pre>
            ) : (
              <EmptyState description="Шаблон появится после проверки SQL." />
            )}
          </Panel>

          <Panel className="sql-report">
            <SectionHeader
              title="Markdown-отчёт"
              description="Готовый отчёт для вставки в задачу или PR."
              actions={
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<ClipboardCopy size={14} />}
                    onClick={handleCopyReport}
                    disabled={!result}
                  >
                    Копировать
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Download size={14} />}
                    onClick={handleDownloadReport}
                    disabled={!result}
                  >
                    Скачать .md
                  </Button>
                </>
              }
            />
            {result ? (
              <pre className="sql-code-block sql-code-block--md custom-scrollbar">
                <code>{result.reportMarkdown}</code>
              </pre>
            ) : (
              <EmptyState description="Отчёт появится после проверки SQL." />
            )}
          </Panel>
        </div>

        <Panel className="sql-history">
          <SectionHeader
            title="История проверок"
            description="Хранится локально в этом браузере. Не уходит на backend."
            icon={<History size={16} />}
            count={history.length}
            actions={
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={handleClearHistory}
                disabled={history.length === 0}
              >
                Очистить историю
              </Button>
            }
          />
          {history.length === 0 ? (
            <EmptyState description="Здесь появятся последние проверки SQL." />
          ) : (
            <ul className="sql-history-list">
              {history.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="sql-history-item"
                    onClick={() => handleSelectHistoryEntry(entry)}
                  >
                    <span className="sql-history-item__head">
                      <Badge variant={RISK_BADGE_VARIANT[entry.riskLevel]}>
                        {RISK_LEVEL_LABELS[entry.riskLevel]}
                      </Badge>
                      <Badge variant="default">
                        {STATEMENT_TYPE_LABELS[entry.statementType]}
                      </Badge>
                      <span className="sql-history-item__count">
                        {entry.issuesCount} замечаний
                      </span>
                      <span className="sql-history-item__date">
                        {formatHistoryDate(entry.createdAt)}
                      </span>
                    </span>
                    <span className="sql-history-item__title">{entry.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
