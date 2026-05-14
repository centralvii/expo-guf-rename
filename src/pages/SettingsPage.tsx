import { useEffect, useState, type ReactNode } from 'react';
import {
  CircleCheck,
  CircleX,
  Database,
  Download,
  Flame,
  Info,
  Key,
  Link2,
  Server,
  ShieldCheck,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { version as appVersion } from '../../package.json';
import { useSettings } from '../hooks/useSettings';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../hooks/useToast';
import {
  invalidateConnection,
  refreshConnection,
  subscribeToConnection,
  type ConnectionSnapshot,
} from '../lib/connectionStatus';
import {
  buildMigrationPlan,
  runMigrationPlan,
  type MigrationConflictStrategy,
  type MigrationEntityType,
  type MigrationPlan,
  type MigrationProgress,
  type MigrationProvider,
} from '../lib/providerMigration';
import { resetSupabaseClient } from '../lib/supabase';
import { resetFirebaseClient } from '../services/firebase/client';
import type { AppTheme, ConnectionMethod } from '../types';
import {
  Badge,
  Button,
  Checkbox,
  InlineError,
  Input,
  Modal,
  PageTitle,
  Panel,
  SectionHeader,
  Select,
  Table,
  ThemePreviewCard,
  THEME_PREVIEWS,
  Toolbar,
  type SelectOption,
} from '../ui';

declare const __APP_GIT_COMMIT__: string;

const CONNECTION_OPTIONS: SelectOption<ConnectionMethod>[] = [
  {
    value: 'supabase',
    label: 'Supabase',
    icon: <Server size={14} />,
    description: 'Hosted PostgreSQL with browser-safe anon access',
  },
  {
    value: 'firebase',
    label: 'Firebase',
    icon: <Flame size={14} />,
    description: 'Google Firebase Firestore for data storage',
  },
  {
    value: 'postgres',
    label: 'PostgreSQL',
    icon: <Database size={14} />,
    description: 'Local or remote PostgreSQL through API/proxy',
  },
];

const THEME_OPTIONS: SelectOption<AppTheme>[] = [
  {
    value: 'default',
    label: 'Default',
    description: 'Current dark theme',
  },
  {
    value: 'nothing',
    label: 'Nothing',
    description: 'Light technical blueprint theme',
  },
  {
    value: '099',
    label: '099',
    description: 'Dark terminal workbench theme',
  },
];

const MIGRATION_PROVIDER_OPTIONS: SelectOption<MigrationProvider>[] = [
  { value: 'supabase', label: 'Supabase' },
  { value: 'firebase', label: 'Firebase' },
];

const MIGRATION_CONFLICT_OPTIONS: SelectOption<MigrationConflictStrategy>[] = [
  {
    value: 'skip_existing',
    label: 'Skip existing',
    description: 'Do not overwrite different records in target',
  },
  {
    value: 'overwrite',
    label: 'Overwrite',
    description: 'Update different records when adapter semantics allow it',
  },
];

const MIGRATION_ENTITY_LABELS: Record<MigrationEntityType, string> = {
  tasks: 'Tasks',
  taskHistory: 'Task history',
};

const CONNECTION_TEST_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

interface SettingsSectionProps {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}

function SettingsSection({ icon, title, description, children }: SettingsSectionProps) {
  return (
    <Panel className="settings-section">
      <SectionHeader
        surface
        className="settings-section__header"
        icon={icon}
        title={title}
        description={description}
      />
      <div className="settings-section__body">{children}</div>
    </Panel>
  );
}

interface SettingsRowProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

function SettingsRow({ label, hint, children }: SettingsRowProps) {
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

export function SettingsPage() {
  const { settings, updateSettings: updateSettingsRaw } = useSettings();
  const { reloadTasks } = useTasks({ autoLoad: false });
  const { notify } = useToast();

  const [snapshot, setSnapshot] = useState<ConnectionSnapshot>({
    state: 'unknown',
    errorKind: null,
    errorMessage: null,
    checkedAt: 0,
  });
  const [isChecking, setIsChecking] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationSource, setMigrationSource] = useState<MigrationProvider>('supabase');
  const [migrationTarget, setMigrationTarget] = useState<MigrationProvider>('firebase');
  const [migrationEntities, setMigrationEntities] = useState<MigrationEntityType[]>(['tasks', 'taskHistory']);
  const [migrationStrategy, setMigrationStrategy] = useState<MigrationConflictStrategy>('skip_existing');
  const [migrationPlan, setMigrationPlan] = useState<MigrationPlan | null>(null);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress>({
    state: 'idle',
    total: 0,
    completed: 0,
    errors: [],
  });
  const [migrationError, setMigrationError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToConnection(setSnapshot);
    refreshConnection(false).then(setSnapshot);
    return unsubscribe;
  }, []);

  const connectionKeys: (keyof typeof settings)[] = [
    'connectionMethod',
    'supabaseUrl',
    'supabaseAnonKey',
    'postgresUrl',
    'firebaseApiKey',
    'firebaseAuthDomain',
    'firebaseProjectId',
    'firebaseStorageBucket',
    'firebaseMessagingSenderId',
    'firebaseAppId',
    'firebaseMeasurementId',
  ];

  const updateSettings = (updates: Partial<typeof settings>) => {
    updateSettingsRaw(updates);
    const shouldRefreshConnection = connectionKeys.some((key) => key in updates);

    if (shouldRefreshConnection) {
      resetSupabaseClient();
      resetFirebaseClient();
      invalidateConnection();
    }

    if (updates.connectionMethod) {
      notify(`Метод подключения изменён на ${updates.connectionMethod}`);
    }
  };

  const resetMigrationState = () => {
    setMigrationPlan(null);
    setMigrationError(null);
    setMigrationProgress({
      state: 'idle',
      total: 0,
      completed: 0,
      errors: [],
    });
  };

  const handleThemeChange = (theme: AppTheme) => {
    updateSettingsRaw({ theme });
    notify(`Тема изменена на ${THEME_PREVIEWS[theme].label}`, 'success');
  };

  const handleToggleMigrationEntity = (entityType: MigrationEntityType, checked: boolean) => {
    resetMigrationState();
    setMigrationEntities((prev) =>
      checked
        ? Array.from(new Set([...prev, entityType]))
        : prev.filter((entity) => entity !== entityType)
    );
  };

  const handleCheckMigration = async () => {
    if (migrationSource === migrationTarget) {
      setMigrationError('Source и target provider должны отличаться.');
      return;
    }

    if (migrationEntities.length === 0) {
      setMigrationError('Выберите хотя бы одну сущность для миграции.');
      return;
    }

    setMigrationError(null);
    setMigrationPlan(null);
    setMigrationProgress({
      state: 'checking',
      total: 0,
      completed: 0,
      errors: [],
    });

    try {
      const plan = await buildMigrationPlan({
        source: migrationSource,
        target: migrationTarget,
        conflictStrategy: migrationStrategy,
        entities: migrationEntities,
      });

      setMigrationPlan(plan);
      setMigrationProgress({
        state: 'ready',
        total: plan.entities.reduce((sum, entity) => sum + entity.toCreate + entity.toUpdate, 0),
        completed: 0,
        errors: [],
      });
      notify('Dry-run миграции готов', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось построить migration plan';
      setMigrationError(message);
      setMigrationProgress({
        state: 'failed',
        total: 0,
        completed: 0,
        errors: [{ entityType: 'tasks', message }],
      });
      notify(message, 'error');
    }
  };

  const handleRunMigration = async () => {
    if (!migrationPlan) {
      setMigrationError('Сначала выполните dry-run миграции.');
      return;
    }

    setShowMigrationModal(false);
    setMigrationError(null);
    setMigrationProgress((prev) => ({
      ...prev,
      state: 'running',
      completed: 0,
      errors: [],
    }));

    const result = await runMigrationPlan({
      plan: migrationPlan,
      onProgress: (progress) => setMigrationProgress(progress),
    });

    setMigrationProgress(result);

    if (result.state === 'done') {
      notify('Миграция завершена', result.errors.length > 0 ? 'info' : 'success');
    } else {
      const message = result.errors[0]?.message ?? 'Миграция завершилась с ошибкой';
      setMigrationError(message);
      notify(message, 'error');
    }
  };

  const handleSwitchToMigrationTarget = () => {
    updateSettings({ connectionMethod: migrationTarget });
    notify(`Активный provider переключен на ${migrationTarget}`, 'success');
  };

  const handleTestConnection = async () => {
    setIsChecking(true);
    try {
      resetSupabaseClient();
      resetFirebaseClient();
      invalidateConnection();

      const snap = await withTimeout(
        refreshConnection(true),
        CONNECTION_TEST_TIMEOUT_MS,
        'Проверка подключения заняла слишком много времени'
      );
      setSnapshot(snap);

      if (snap.state === 'online') {
        void reloadTasks();
        notify('Подключение успешно', 'success');
      } else {
        notify(snap.errorMessage ?? 'Не удалось подключиться', 'error');
      }
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Не удалось проверить подключение',
        'error'
      );
    } finally {
      setIsChecking(false);
    }
  };

  const handleClearLocalData = () => {
    const prefixes = ['gd-helper-', 'bpmn_polygon_diagrams'];

    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && prefixes.some((prefix) => key.startsWith(prefix) || key === prefix)) {
        if (key === 'gd-helper-settings') {
          continue;
        }
        localStorage.removeItem(key);
      }
    }

    notify('Локальные данные очищены', 'info');
    setShowResetModal(false);
  };

  const handleExportSettings = () => {
    const data = JSON.stringify(settings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gd-helper-settings.json';
    link.click();
    URL.revokeObjectURL(url);
    notify('Настройки экспортированы');
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        updateSettings(parsed);
        notify('Настройки импортированы', 'success');
      } catch {
        notify('Неверный формат файла', 'error');
      }
    };
    input.click();
  };

  const connectionBadge = (() => {
    if (snapshot.state === 'unknown') {
      return { variant: 'default' as const, label: 'Проверка...', icon: <Wifi size={12} /> };
    }

    if (snapshot.state === 'online') {
      return { variant: 'success' as const, label: 'Онлайн', icon: <CircleCheck size={12} /> };
    }

    return { variant: 'danger' as const, label: 'Оффлайн', icon: <CircleX size={12} /> };
  })();

  const errorHint = (() => {
    if (snapshot.state !== 'offline' || !snapshot.errorKind) {
      return null;
    }

    switch (snapshot.errorKind) {
      case 'config':
        if (settings.connectionMethod === 'supabase') {
          return 'Заполните Supabase URL и anon key.';
        }
        if (settings.connectionMethod === 'postgres') {
          return 'Заполните URL API/proxy для PostgreSQL.';
        }
        return 'Заполните Firebase config или выберите другой provider.';
      case 'network':
        return 'Сервис подключения недоступен. Проверьте URL и доступность backend/proxy.';
      case 'cors':
        return 'CORS блокирует запрос. Проверьте настройки backend или Supabase.';
      case 'api':
        return snapshot.errorMessage ?? 'Сервер вернул ошибку';
      default:
        return null;
    }
  })();

  const canCheckMigration = migrationEntities.length > 0
    && migrationSource !== migrationTarget
    && migrationProgress.state !== 'checking'
    && migrationProgress.state !== 'running';

  const canRunMigration = migrationPlan !== null
    && migrationProgress.state !== 'checking'
    && migrationProgress.state !== 'running';

  return (
    <>
      <div className="tool-page anim-fade-in">
        <div className="tool-page__content tool-page__content--auto">
          <Toolbar>
            <Toolbar.Left>
              <PageTitle>Настройки</PageTitle>
            </Toolbar.Left>
            <Toolbar.Right>
              <Badge variant={connectionBadge.variant} dot>
                {connectionBadge.label}
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                icon={snapshot.state === 'offline' ? <WifiOff size={14} /> : <Wifi size={14} />}
                onClick={handleTestConnection}
                isLoading={isChecking}
              >
                Проверить
              </Button>
            </Toolbar.Right>
          </Toolbar>

          {errorHint && (
            <InlineError
              className="settings-error-banner"
              title="Нет подключения к базе данных"
              message={errorHint}
            />
          )}

          <SettingsSection
            icon={<Link2 size={18} />}
            title="Подключение"
            description="Выберите источник данных для задач и заметок"
          >
            <SettingsRow
              label="Метод подключения"
              hint="Как приложение работает с базой данных"
            >
              <Select
                value={settings.connectionMethod}
                onChange={(method) => updateSettings({ connectionMethod: method })}
                options={CONNECTION_OPTIONS}
                size="sm"
              />
            </SettingsRow>

            {settings.connectionMethod === 'supabase' && (
              <>
                <SettingsRow label="Supabase URL">
                  <Input
                    value={settings.supabaseUrl}
                    onChange={(event) => updateSettings({ supabaseUrl: event.target.value })}
                    placeholder="https://xyz.supabase.co"
                    noContainer
                    fullWidth
                    icon={<Link2 size={14} />}
                  />
                </SettingsRow>
                <SettingsRow label="Supabase Anon Key">
                  <Input
                    type="password"
                    value={settings.supabaseAnonKey}
                    onChange={(event) => updateSettings({ supabaseAnonKey: event.target.value })}
                    placeholder="eyJhbG..."
                    noContainer
                    fullWidth
                    icon={<Key size={14} />}
                  />
                </SettingsRow>
              </>
            )}

            {settings.connectionMethod === 'postgres' && (
              <>
                <SettingsRow
                  label="PostgreSQL Proxy URL"
                  hint="Frontend должен ходить в API/proxy, а не напрямую в PostgreSQL"
                >
                  <Input
                    value={settings.postgresUrl}
                    onChange={(event) => updateSettings({ postgresUrl: event.target.value })}
                    placeholder="http://localhost:5432"
                    noContainer
                    fullWidth
                    icon={<Link2 size={14} />}
                  />
                </SettingsRow>
                <div className="settings-info">
                  <Info size={14} />
                  <span>Для browser-only режима нужен backend или proxy со стабильным /tasks API.</span>
                </div>
              </>
            )}

            {settings.connectionMethod === 'firebase' && (
              <>
                <SettingsRow label="API Key" hint="Firebase Web API Key (не секретный)">
                  <Input
                    value={settings.firebaseApiKey}
                    onChange={(event) => updateSettings({ firebaseApiKey: event.target.value })}
                    placeholder="AIzaSy..."
                    noContainer
                    fullWidth
                    icon={<Key size={14} />}
                  />
                </SettingsRow>
                <SettingsRow label="Auth Domain" hint="Например, your-project.firebaseapp.com">
                  <Input
                    value={settings.firebaseAuthDomain}
                    onChange={(event) => updateSettings({ firebaseAuthDomain: event.target.value })}
                    placeholder="your-project.firebaseapp.com"
                    noContainer
                    fullWidth
                    icon={<Link2 size={14} />}
                  />
                </SettingsRow>
                <SettingsRow label="Project ID" hint="Идентификатор Firebase проекта">
                  <Input
                    value={settings.firebaseProjectId}
                    onChange={(event) => updateSettings({ firebaseProjectId: event.target.value })}
                    placeholder="your-project-id"
                    noContainer
                    fullWidth
                    icon={<Database size={14} />}
                  />
                </SettingsRow>
                <SettingsRow label="Storage Bucket" hint="Опционально, для хранения файлов">
                  <Input
                    value={settings.firebaseStorageBucket}
                    onChange={(event) => updateSettings({ firebaseStorageBucket: event.target.value })}
                    placeholder="your-project.appspot.com"
                    noContainer
                    fullWidth
                    icon={<Database size={14} />}
                  />
                </SettingsRow>
                <SettingsRow label="Messaging Sender ID" hint="Опционально, для push-уведомлений">
                  <Input
                    value={settings.firebaseMessagingSenderId}
                    onChange={(event) => updateSettings({ firebaseMessagingSenderId: event.target.value })}
                    placeholder="123456789"
                    noContainer
                    fullWidth
                  />
                </SettingsRow>
                <SettingsRow label="App ID" hint="Firebase App ID">
                  <Input
                    value={settings.firebaseAppId}
                    onChange={(event) => updateSettings({ firebaseAppId: event.target.value })}
                    placeholder="1:123456789:web:abc123"
                    noContainer
                    fullWidth
                  />
                </SettingsRow>
                <SettingsRow label="Measurement ID" hint="Опционально, для Google Analytics">
                  <Input
                    value={settings.firebaseMeasurementId}
                    onChange={(event) => updateSettings({ firebaseMeasurementId: event.target.value })}
                    placeholder="G-XXXXXXXXXX"
                    noContainer
                    fullWidth
                  />
                </SettingsRow>
                <div className="settings-info">
                  <Info size={14} />
                  <span>Настройки Firebase безопасны для frontend. Доступ к данным контролируется Firebase Security Rules.</span>
                </div>
              </>
            )}
          </SettingsSection>

          <SettingsSection
            icon={<Info size={18} />}
            title="Внешний вид"
            description="Выберите активную тему интерфейса"
          >
            <div className="settings-row settings-row--stacked">
              <div className="settings-row__info">
                <span className="settings-row__label">Тема приложения</span>
                <span className="settings-row__hint">Выберите тему кликом по превью. Изменения применяются сразу.</span>
              </div>
              <div className="settings-row__control">
                <div className="theme-preview-grid">
                  {THEME_OPTIONS.map((option) => (
                    <ThemePreviewCard
                      key={option.value}
                      value={option.value}
                      label={option.label}
                      description={option.description ?? ''}
                      selected={settings.theme === option.value}
                      onSelect={handleThemeChange}
                    />
                  ))}
                </div>
              </div>
            </div>
            <SettingsRow
              label="Тема приложения"
              hint="Список тем для точного выбора и keyboard-навигации"
            >
              <Select
                value={settings.theme}
                onChange={handleThemeChange}
                options={THEME_OPTIONS}
                size="sm"
              />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection
            icon={<Database size={18} />}
            title="Данные"
            description="Управление локальными данными и настройками"
          >
            <SettingsRow label="Экспорт настроек" hint="Сохранить текущую конфигурацию в JSON файл">
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={14} />}
                onClick={handleExportSettings}
              >
                Экспорт
              </Button>
            </SettingsRow>

            <SettingsRow label="Импорт настроек" hint="Восстановить конфигурацию из JSON файла">
              <Button
                variant="secondary"
                size="sm"
                icon={<Upload size={14} />}
                onClick={handleImportSettings}
              >
                Импорт
              </Button>
            </SettingsRow>

            <SettingsRow
              label="Очистка локальных данных"
              hint="Удалит сохранённые BPMN-диаграммы, API-запросы и локальные сессии. Настройки подключения сохранятся."
            >
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => setShowResetModal(true)}
              >
                Очистить
              </Button>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection
            icon={<Database size={18} />}
            title="Миграция данных"
            description="Dry-run и перенос данных Task Helper между актуальными provider-ами без автоматического switch active provider"
          >
            <SettingsRow label="Source provider" hint="Откуда читать задачи и историю задач">
              <Select
                value={migrationSource}
                onChange={(value) => {
                  setMigrationSource(value);
                  resetMigrationState();
                }}
                options={MIGRATION_PROVIDER_OPTIONS}
                size="sm"
              />
            </SettingsRow>

            <SettingsRow
              label="Target provider"
              hint="Куда записывать данные. Active provider автоматически не переключается"
            >
              <Select
                value={migrationTarget}
                onChange={(value) => {
                  setMigrationTarget(value);
                  resetMigrationState();
                }}
                options={MIGRATION_PROVIDER_OPTIONS}
                size="sm"
              />
            </SettingsRow>

            <div className="settings-row settings-row--stacked">
              <div className="settings-row__info">
                <span className="settings-row__label">Сущности для миграции</span>
                <span className="settings-row__hint">На первом этапе мигрируются только tasks и task history.</span>
              </div>
              <div className="settings-row__control">
                <div className="settings-checklist">
                  <Checkbox
                    checked={migrationEntities.includes('tasks')}
                    onChange={(event) => handleToggleMigrationEntity('tasks', event.target.checked)}
                    label="Tasks"
                  />
                  <Checkbox
                    checked={migrationEntities.includes('taskHistory')}
                    onChange={(event) => handleToggleMigrationEntity('taskHistory', event.target.checked)}
                    label="Task history"
                  />
                </div>
              </div>
            </div>

            <SettingsRow
              label="Conflict strategy"
              hint="Что делать, если запись уже существует в target"
            >
              <Select
                value={migrationStrategy}
                onChange={(value) => {
                  setMigrationStrategy(value);
                  resetMigrationState();
                }}
                options={MIGRATION_CONFLICT_OPTIONS}
                size="sm"
              />
            </SettingsRow>

            {migrationError && (
              <div className="settings-row settings-row--stacked">
                <InlineError
                  title="Миграция сейчас недоступна"
                  message={migrationError}
                />
              </div>
            )}

            <div className="settings-row settings-row--stacked">
              <div className="settings-row__info">
                <span className="settings-row__label">Dry-run</span>
                <span className="settings-row__hint">Ничего не записывает, только строит план миграции и показывает конфликты.</span>
              </div>
              <div className="settings-row__control">
                <div className="settings-actions">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCheckMigration}
                    isLoading={migrationProgress.state === 'checking'}
                    disabled={!canCheckMigration}
                  >
                    Проверить миграцию
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowMigrationModal(true)}
                    disabled={!canRunMigration}
                  >
                    Запустить миграцию
                  </Button>
                </div>
              </div>
            </div>

            {migrationPlan && (
              <div className="settings-row settings-row--stacked">
                <div className="settings-row__info">
                  <span className="settings-row__label">Migration plan</span>
                  <span className="settings-row__hint">
                    {migrationPlan.source} {'->'} {migrationPlan.target} / strategy: {migrationPlan.conflictStrategy}
                  </span>
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
                        {migrationPlan.entities.map((entity) => (
                          <Table.Row key={entity.type}>
                            <Table.Cell>{MIGRATION_ENTITY_LABELS[entity.type]}</Table.Cell>
                            <Table.Cell>{entity.sourceCount}</Table.Cell>
                            <Table.Cell>{entity.targetCount}</Table.Cell>
                            <Table.Cell>{entity.toCreate}</Table.Cell>
                            <Table.Cell>{entity.toUpdate}</Table.Cell>
                            <Table.Cell>{entity.toSkip}</Table.Cell>
                            <Table.Cell>
                              <Badge variant={entity.conflicts.length > 0 ? 'warning' : 'default'}>
                                {entity.conflicts.length}
                              </Badge>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table>

                    {migrationPlan.entities.some((entity) => entity.conflicts.length > 0) && (
                      <div className="settings-conflicts">
                        {migrationPlan.entities.map((entity) => (
                          entity.conflicts.length > 0 ? (
                            <div key={`${entity.type}-conflicts`} className="settings-conflicts__group">
                              <strong>{MIGRATION_ENTITY_LABELS[entity.type]}</strong>
                              <ul className="settings-conflicts__list">
                                {entity.conflicts.slice(0, 8).map((conflict) => (
                                  <li key={conflict.entityId}>
                                    <span className="settings-value--mono">{conflict.entityId}</span>
                                    <span>{conflict.message}</span>
                                  </li>
                                ))}
                                {entity.conflicts.length > 8 && (
                                  <li>И ещё {entity.conflicts.length - 8}</li>
                                )}
                              </ul>
                            </div>
                          ) : null
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {migrationProgress.state !== 'idle' && migrationProgress.state !== 'checking' && (
              <div className="settings-row settings-row--stacked">
                <div className="settings-row__info">
                  <span className="settings-row__label">Прогресс</span>
                  <span className="settings-row__hint">
                    {migrationProgress.currentEntity
                      ? `Текущая сущность: ${MIGRATION_ENTITY_LABELS[migrationProgress.currentEntity]}`
                      : 'Ожидание следующего шага'}
                  </span>
                </div>
                <div className="settings-row__control">
                  <div className="settings-progress">
                    <div className="settings-progress__meta">
                      <Badge
                        variant={
                          migrationProgress.state === 'done'
                            ? 'success'
                            : migrationProgress.state === 'failed'
                              ? 'danger'
                              : 'default'
                        }
                      >
                        {migrationProgress.state}
                      </Badge>
                      <span>{migrationProgress.completed} / {migrationProgress.total}</span>
                    </div>

                    {migrationProgress.errors.length > 0 && (
                      <ul className="settings-progress__errors">
                        {migrationProgress.errors.slice(0, 8).map((error, index) => (
                          <li key={`${error.entityType}-${error.entityId ?? 'common'}-${index}`}>
                            <span className="settings-value--mono">{error.entityType}</span>
                            <span>{error.message}</span>
                          </li>
                        ))}
                        {migrationProgress.errors.length > 8 && (
                          <li>И ещё {migrationProgress.errors.length - 8} ошибок</li>
                        )}
                      </ul>
                    )}

                    {migrationProgress.state === 'done' && migrationTarget !== settings.connectionMethod && (
                      <div className="settings-actions">
                        <Button size="sm" variant="secondary" onClick={handleSwitchToMigrationTarget}>
                          Переключиться на target provider
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </SettingsSection>

          <SettingsSection icon={<ShieldCheck size={18} />} title="Система">
            <SettingsRow label="Версия приложения">
              <span className="settings-value settings-value--mono">{appVersion}</span>
            </SettingsRow>
            <SettingsRow label="Git commit">
              <span className="settings-value settings-value--mono">{__APP_GIT_COMMIT__}</span>
            </SettingsRow>
            <SettingsRow label="Среда">
              <span className="settings-value settings-value--mono">{import.meta.env.MODE}</span>
            </SettingsRow>
            <SettingsRow label="React">
              <span className="settings-value settings-value--mono">19.2.4</span>
            </SettingsRow>
          </SettingsSection>
        </div>
      </div>

      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Очистить локальные данные?"
        variant="danger"
        footer={(
          <>
            <Button size="sm" variant="secondary" onClick={() => setShowResetModal(false)}>
              Отмена
            </Button>
            <Button size="sm" variant="danger" onClick={handleClearLocalData}>
              Очистить
            </Button>
          </>
        )}
      >
        <p>
          Будут удалены все сохранённые BPMN-диаграммы, API-запросы, локальные сессии и история.
          Настройки подключения сохранятся. Действие необратимо.
        </p>
      </Modal>

      <Modal
        isOpen={showMigrationModal}
        onClose={() => setShowMigrationModal(false)}
        title="Запустить миграцию данных?"
        footer={(
          <>
            <Button size="sm" variant="secondary" onClick={() => setShowMigrationModal(false)}>
              Отмена
            </Button>
            <Button size="sm" onClick={handleRunMigration}>
              Запустить миграцию
            </Button>
          </>
        )}
      >
        <p>
          Будут перенесены только выбранные сущности Task Helper из <strong>{migrationSource}</strong> в{' '}
          <strong>{migrationTarget}</strong>. Source-данные не удаляются, active provider не переключается автоматически.
        </p>
        <p>
          Если strategy = <strong>overwrite</strong>, будут обновляться только поддерживаемые записи.
          Task history без upsert/delete semantics останется в safe-режиме.
        </p>
      </Modal>
    </>
  );
}
