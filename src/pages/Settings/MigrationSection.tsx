import { memo, type ReactNode } from 'react';
import { Badge, Button, Checkbox, InlineError, Select, Table, type SelectOption } from '../../ui';
import type { MigrationConflictStrategy, MigrationEntityType, MigrationPlan, MigrationProgress, MigrationProvider } from '../../lib/providerMigration';

const MIGRATION_PROVIDER_OPTIONS: SelectOption<MigrationProvider>[] = [
  { value: 'supabase', label: 'Supabase' },
  { value: 'firebase', label: 'Firebase' },
];

const MIGRATION_CONFLICT_OPTIONS: SelectOption<MigrationConflictStrategy>[] = [
  { value: 'skip_existing', label: 'Skip existing', description: 'Do not overwrite different records in target' },
  { value: 'overwrite', label: 'Overwrite', description: 'Update different records when adapter semantics allow it' },
];

const MIGRATION_ENTITY_LABELS: Record<MigrationEntityType, string> = { tasks: 'Tasks', taskHistory: 'Task history' };

function SettingsRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="settings-row">
      <div className="settings-row__info">
        <span className="settings-row__label">{label}</span>
        {hint && <span className="settings-row__hint">{hint}</span>}
      </div>
      <div className="settings-row__control">{children}</div>
    </div>
  );
}

interface MigrationSectionProps {
  source: MigrationProvider;
  target: MigrationProvider;
  entities: MigrationEntityType[];
  strategy: MigrationConflictStrategy;
  plan: MigrationPlan | null;
  progress: MigrationProgress;
  error: string | null;
  onSourceChange: (v: MigrationProvider) => void;
  onTargetChange: (v: MigrationProvider) => void;
  onEntityToggle: (entity: MigrationEntityType, checked: boolean) => void;
  onStrategyChange: (v: MigrationConflictStrategy) => void;
  onCheckMigration: () => void;
  onRunClick: () => void;
  onSwitchToTarget: () => void;
}

function MigrationSection_(props: MigrationSectionProps) {
  const canCheckMigration = props.entities.length > 0
    && props.source !== props.target
    && props.progress.state !== 'checking'
    && props.progress.state !== 'running';

  const canRunMigration = props.plan !== null
    && props.progress.state !== 'checking'
    && props.progress.state !== 'running';

  return (
    <div className="settings-section__body">
      <SettingsRow label="Source provider" hint="Откуда читать задачи и историю задач">
        <Select value={props.source} onChange={props.onSourceChange} options={MIGRATION_PROVIDER_OPTIONS} size="sm" />
      </SettingsRow>

      <SettingsRow label="Target provider" hint="Куда записывать данные. Active provider автоматически не переключается">
        <Select value={props.target} onChange={props.onTargetChange} options={MIGRATION_PROVIDER_OPTIONS} size="sm" />
      </SettingsRow>

      <div className="settings-row settings-row--stacked">
        <div className="settings-row__info">
          <span className="settings-row__label">Сущности для миграции</span>
          <span className="settings-row__hint">На первом этапе мигрируются только tasks и task history.</span>
        </div>
        <div className="settings-row__control">
          <div className="settings-checklist">
            <Checkbox checked={props.entities.includes('tasks')} onChange={(e) => props.onEntityToggle('tasks', e.target.checked)} label="Tasks" />
            <Checkbox checked={props.entities.includes('taskHistory')} onChange={(e) => props.onEntityToggle('taskHistory', e.target.checked)} label="Task history" />
          </div>
        </div>
      </div>

      <SettingsRow label="Conflict strategy" hint="Что делать, если запись уже существует в target">
        <Select value={props.strategy} onChange={props.onStrategyChange} options={MIGRATION_CONFLICT_OPTIONS} size="sm" />
      </SettingsRow>

      {props.error && (
        <div className="settings-row settings-row--stacked">
          <InlineError title="Миграция сейчас недоступна" message={props.error} />
        </div>
      )}

      <div className="settings-row settings-row--stacked">
        <div className="settings-row__info">
          <span className="settings-row__label">Dry-run</span>
          <span className="settings-row__hint">Ничего не записывает, только строит план миграции и показывает конфликты.</span>
        </div>
        <div className="settings-row__control">
          <div className="settings-actions">
            <Button size="sm" variant="secondary" onClick={props.onCheckMigration} isLoading={props.progress.state === 'checking'} disabled={!canCheckMigration}>
              Проверить миграцию
            </Button>
            <Button size="sm" onClick={props.onRunClick} disabled={!canRunMigration}>
              Запустить миграцию
            </Button>
          </div>
        </div>
      </div>

      {props.plan && (
        <div className="settings-row settings-row--stacked">
          <div className="settings-row__info">
            <span className="settings-row__label">Migration plan</span>
            <span className="settings-row__hint">{props.plan.source} {'->'} {props.plan.target} / strategy: {props.plan.conflictStrategy}</span>
          </div>
          <div className="settings-row__control">
            <div className="settings-migration-plan">
              <Table>
                <Table.Head>
                  <Table.Row>
                    <Table.HeaderCell>Entity</Table.HeaderCell>
                    <Table.HeaderCell>Source</Table.HeaderCell>
                    <Table.HeaderCell>Target</Table.HeaderCell>
                    <Table.HeaderCell>To create</Table.HeaderCell>
                    <Table.HeaderCell>To update</Table.HeaderCell>
                    <Table.HeaderCell>To skip</Table.HeaderCell>
                    <Table.HeaderCell>Conflicts</Table.HeaderCell>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {props.plan.entities.map((entity) => (
                    <Table.Row key={entity.type}>
                      <Table.Cell>{MIGRATION_ENTITY_LABELS[entity.type]}</Table.Cell>
                      <Table.Cell>{entity.sourceCount}</Table.Cell>
                      <Table.Cell>{entity.targetCount}</Table.Cell>
                      <Table.Cell>{entity.toCreate}</Table.Cell>
                      <Table.Cell>{entity.toUpdate}</Table.Cell>
                      <Table.Cell>{entity.toSkip}</Table.Cell>
                      <Table.Cell><Badge variant={entity.conflicts.length > 0 ? 'warning' : 'default'}>{entity.conflicts.length}</Badge></Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>

              {props.plan.entities.some((e) => e.conflicts.length > 0) && (
                <div className="settings-conflicts">
                  {props.plan.entities.map((entity) => entity.conflicts.length > 0 ? (
                    <div key={`${entity.type}-conflicts`} className="settings-conflicts__group">
                      <strong>{MIGRATION_ENTITY_LABELS[entity.type]}</strong>
                      <ul className="settings-conflicts__list">
                        {entity.conflicts.slice(0, 8).map((conflict) => (
                          <li key={conflict.entityId}>
                            <span className="settings-value--mono">{conflict.entityId}</span>
                            <span>{conflict.message}</span>
                          </li>
                        ))}
                        {entity.conflicts.length > 8 && <li>И ещё {entity.conflicts.length - 8}</li>}
                      </ul>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {props.progress.state !== 'idle' && props.progress.state !== 'checking' && (
        <div className="settings-row settings-row--stacked">
          <div className="settings-row__info">
            <span className="settings-row__label">Прогресс</span>
            <span className="settings-row__hint">
              {props.progress.currentEntity ? `Текущая сущность: ${MIGRATION_ENTITY_LABELS[props.progress.currentEntity]}` : 'Ожидание следующего шага'}
            </span>
          </div>
          <div className="settings-row__control">
            <div className="settings-progress">
              <div className="settings-progress__meta">
                <Badge variant={props.progress.state === 'done' ? 'success' : props.progress.state === 'failed' ? 'danger' : 'default'}>
                  {props.progress.state}
                </Badge>
                <span>{props.progress.completed} / {props.progress.total}</span>
              </div>

              {props.progress.errors.length > 0 && (
                <ul className="settings-progress__errors">
                  {props.progress.errors.slice(0, 8).map((error, index) => (
                    <li key={`${error.entityType}-${error.entityId ?? 'common'}-${index}`}>
                      <span className="settings-value--mono">{error.entityType}</span>
                      <span>{error.message}</span>
                    </li>
                  ))}
                  {props.progress.errors.length > 8 && <li>И ещё {props.progress.errors.length - 8} ошибок</li>}
                </ul>
              )}

              {props.progress.state === 'done' && (
                <div className="settings-actions">
                  <Button size="sm" variant="secondary" onClick={props.onSwitchToTarget}>
                    Переключиться на target provider
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const MigrationSection = memo(MigrationSection_);
