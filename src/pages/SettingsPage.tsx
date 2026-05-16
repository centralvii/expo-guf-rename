import { useEffect, useState, type ReactNode } from 'react';
import '../Settings.css';
import { CircleCheck, CircleX, Database, Info, Link2, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { version as appVersion } from '../../package.json';
import { useSettings } from '../hooks/useSettings';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../hooks/useToast';
import { invalidateConnection, refreshConnection, subscribeToConnection, type ConnectionSnapshot } from '../lib/connectionStatus';
import { buildMigrationPlan, runMigrationPlan, type MigrationConflictStrategy, type MigrationEntityType, type MigrationPlan, type MigrationProgress, type MigrationProvider } from '../lib/providerMigration';
import { resetSupabaseClient } from '../lib/supabase';
import { resetFirebaseClient } from '../services/firebase/client';
import { Badge, Button, InlineError, Modal, PageTitle, Panel, SectionHeader, Toolbar } from '../ui';
import { ConnectionSection } from './Settings/ConnectionSection';
import { AppearanceSection } from './Settings/AppearanceSection';
import { DataSection } from './Settings/DataSection';
import { MigrationSection } from './Settings/MigrationSection';
import { SystemSection } from './Settings/SystemSection';

declare const __APP_GIT_COMMIT__: string;

const CONNECTION_TEST_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then((value) => { window.clearTimeout(timer); resolve(value); }).catch((error) => { window.clearTimeout(timer); reject(error); });
  });
}

interface SettingsSectionProps { icon: ReactNode; title: string; description?: string; children: ReactNode; }

function SettingsSection({ icon, title, description, children }: SettingsSectionProps) {
  return (
    <Panel className="settings-section">
      <SectionHeader surface className="settings-section__header" icon={icon} title={title} description={description} />
      {children}
    </Panel>
  );
}

export function SettingsPage() {
  const { settings, updateSettings: updateSettingsRaw } = useSettings();
  const { reloadTasks } = useTasks({ autoLoad: false });
  const { notify } = useToast();

  const [snapshot, setSnapshot] = useState<ConnectionSnapshot>({ state: 'unknown', errorKind: null, errorMessage: null, checkedAt: 0 });
  const [isChecking, setIsChecking] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationSource, setMigrationSource] = useState<MigrationProvider>('supabase');
  const [migrationTarget, setMigrationTarget] = useState<MigrationProvider>('firebase');
  const [migrationEntities, setMigrationEntities] = useState<MigrationEntityType[]>(['tasks', 'taskHistory']);
  const [migrationStrategy, setMigrationStrategy] = useState<MigrationConflictStrategy>('skip_existing');
  const [migrationPlan, setMigrationPlan] = useState<MigrationPlan | null>(null);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress>({ state: 'idle', total: 0, completed: 0, errors: [] });
  const [migrationError, setMigrationError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToConnection(setSnapshot);
    refreshConnection(false).then(setSnapshot);
    return unsubscribe;
  }, []);

  const connectionKeys: (keyof typeof settings)[] = [
    'connectionMethod', 'supabaseUrl', 'supabaseAnonKey', 'postgresUrl',
    'firebaseApiKey', 'firebaseAuthDomain', 'firebaseProjectId',
    'firebaseStorageBucket', 'firebaseMessagingSenderId', 'firebaseAppId', 'firebaseMeasurementId',
  ];

  const updateSettings = (updates: Partial<typeof settings>) => {
    updateSettingsRaw(updates);
    if (connectionKeys.some((key) => key in updates)) {
      resetSupabaseClient();
      resetFirebaseClient();
      invalidateConnection();
    }
    if (updates.connectionMethod) notify(`Метод подключения изменён на ${updates.connectionMethod}`);
  };

  const resetMigrationState = () => {
    setMigrationPlan(null);
    setMigrationError(null);
    setMigrationProgress({ state: 'idle', total: 0, completed: 0, errors: [] });
  };

  const handleThemeChange = (theme: typeof settings.theme) => {
    updateSettingsRaw({ theme });
    notify(`Тема изменена`, 'success');
  };

  const handleToggleMigrationEntity = (entityType: MigrationEntityType, checked: boolean) => {
    resetMigrationState();
    setMigrationEntities((prev) => checked ? Array.from(new Set([...prev, entityType])) : prev.filter((e) => e !== entityType));
  };

  const handleCheckMigration = async () => {
    if (migrationSource === migrationTarget) { setMigrationError('Source и target provider должны отличаться.'); return; }
    if (migrationEntities.length === 0) { setMigrationError('Выберите хотя бы одну сущность для миграции.'); return; }
    setMigrationError(null);
    setMigrationPlan(null);
    setMigrationProgress({ state: 'checking', total: 0, completed: 0, errors: [] });
    try {
      const plan = await buildMigrationPlan({ source: migrationSource, target: migrationTarget, conflictStrategy: migrationStrategy, entities: migrationEntities });
      setMigrationPlan(plan);
      setMigrationProgress({ state: 'ready', total: plan.entities.reduce((sum, entity) => sum + entity.toCreate + entity.toUpdate, 0), completed: 0, errors: [] });
      notify('Dry-run миграции готов', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось построить migration plan';
      setMigrationError(message);
      setMigrationProgress({ state: 'failed', total: 0, completed: 0, errors: [{ entityType: 'tasks', message }] });
      notify(message, 'error');
    }
  };

  const handleRunMigration = async () => {
    if (!migrationPlan) { setMigrationError('Сначала выполните dry-run миграции.'); return; }
    setShowMigrationModal(false);
    setMigrationError(null);
    setMigrationProgress((prev) => ({ ...prev, state: 'running', completed: 0, errors: [] }));
    const result = await runMigrationPlan({ plan: migrationPlan, onProgress: (p) => setMigrationProgress(p) });
    setMigrationProgress(result);
    notify('Миграция завершена', result.state === 'done' && result.errors.length === 0 ? 'success' : 'info');
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
      const snap = await withTimeout(refreshConnection(true), CONNECTION_TEST_TIMEOUT_MS, 'Проверка подключения заняла слишком много времени');
      setSnapshot(snap);
      if (snap.state === 'online') { void reloadTasks(); notify('Подключение успешно', 'success'); }
      else { notify(snap.errorMessage ?? 'Не удалось подключиться', 'error'); }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось проверить подключение', 'error');
    } finally { setIsChecking(false); }
  };

  const handleClearLocalData = () => {
    const prefixes = ['gd-helper-', 'bpmn_polygon_diagrams'];
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && prefixes.some((p) => key.startsWith(p) || key === p) && key !== 'gd-helper-settings') {
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
      if (!file) return;
      try {
        const text = await file.text();
        updateSettings(JSON.parse(text));
        notify('Настройки импортированы', 'success');
      } catch { notify('Неверный формат файла', 'error'); }
    };
    input.click();
  };

  const connectionBadge = snapshot.state === 'unknown' ? { variant: 'default' as const, label: 'Проверка...' }
    : snapshot.state === 'online' ? { variant: 'success' as const, label: 'Онлайн' }
    : { variant: 'danger' as const, label: 'Оффлайн' };

  const errorHint = snapshot.state !== 'offline' || !snapshot.errorKind ? null
    : snapshot.errorKind === 'config' ? (settings.connectionMethod === 'supabase' ? 'Заполните Supabase URL и anon key.'
        : settings.connectionMethod === 'postgres' ? 'Заполните URL API/proxy для PostgreSQL.'
        : 'Заполните Firebase config или выберите другой provider.')
    : snapshot.errorKind === 'network' ? 'Сервис подключения недоступен. Проверьте URL и доступность backend/proxy.'
    : snapshot.errorKind === 'cors' ? 'CORS блокирует запрос. Проверьте настройки backend или Supabase.'
    : snapshot.errorMessage ?? null;

  return (
    <>
      <div className="tool-page anim-fade-in">
        <div className="tool-page__content tool-page__content--auto">
          <Toolbar>
            <Toolbar.Left>
              <PageTitle>Настройки</PageTitle>
            </Toolbar.Left>
            <Toolbar.Right>
              <Badge variant={connectionBadge.variant} dot>{connectionBadge.label}</Badge>
              <Button variant="secondary" size="sm" icon={snapshot.state === 'offline' ? <WifiOff size={14} /> : <Wifi size={14} />} onClick={handleTestConnection} isLoading={isChecking}>Проверить</Button>
            </Toolbar.Right>
          </Toolbar>

          {errorHint && <InlineError className="settings-error-banner" title="Нет подключения к базе данных" message={errorHint} />}

          <SettingsSection icon={<Link2 size={18} />} title="Подключение" description="Выберите источник данных для задач и заметок">
            <ConnectionSection settings={settings} onUpdate={updateSettings} />
          </SettingsSection>

          <SettingsSection icon={<Info size={18} />} title="Внешний вид" description="Выберите активную тему интерфейса">
            <AppearanceSection settings={settings} onThemeChange={handleThemeChange} />
          </SettingsSection>

          <SettingsSection icon={<Database size={18} />} title="Данные" description="Управление локальными данными и настройками">
            <DataSection onExport={handleExportSettings} onImport={handleImportSettings} onClear={() => setShowResetModal(true)} />
          </SettingsSection>

          <SettingsSection icon={<Database size={18} />} title="Миграция данных" description="Dry-run и перенос данных Task Helper между provider-ами">
            <MigrationSection
              source={migrationSource} target={migrationTarget} entities={migrationEntities} strategy={migrationStrategy}
              plan={migrationPlan} progress={migrationProgress} error={migrationError}
              onSourceChange={(v) => { setMigrationSource(v); resetMigrationState(); }}
              onTargetChange={(v) => { setMigrationTarget(v); resetMigrationState(); }}
              onEntityToggle={handleToggleMigrationEntity}
              onStrategyChange={(v) => { setMigrationStrategy(v); resetMigrationState(); }}
              onCheckMigration={handleCheckMigration}
              onRunClick={() => setShowMigrationModal(true)}
              onSwitchToTarget={handleSwitchToMigrationTarget}
            />
          </SettingsSection>

          <SettingsSection icon={<ShieldCheck size={18} />} title="Система">
            <SystemSection appVersion={appVersion} gitCommit={__APP_GIT_COMMIT__} mode={import.meta.env.MODE} />
          </SettingsSection>
        </div>
      </div>

      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title="Очистить локальные данные?" variant="danger"
        footer={<><Button size="sm" variant="secondary" onClick={() => setShowResetModal(false)}>Отмена</Button><Button size="sm" variant="danger" onClick={handleClearLocalData}>Очистить</Button></>}
      >
        <p>Будут удалены все сохранённые BPMN-диаграммы, API-запросы, локальные сессии и история. Настройки подключения сохранятся. Действие необратимо.</p>
      </Modal>

      <Modal isOpen={showMigrationModal} onClose={() => setShowMigrationModal(false)} title="Запустить миграцию данных?"
        footer={<><Button size="sm" variant="secondary" onClick={() => setShowMigrationModal(false)}>Отмена</Button><Button size="sm" onClick={handleRunMigration}>Запустить миграцию</Button></>}
      >
        <p>Будут перенесены только выбранные сущности Task Helper из <strong>{migrationSource}</strong> в <strong>{migrationTarget}</strong>. Source-данные не удаляются, active provider не переключается автоматически.</p>
        <p>Если strategy = <strong>overwrite</strong>, будут обновляться только поддерживаемые записи. Task history без upsert/delete semantics останется в safe-режиме.</p>
      </Modal>
    </>
  );
}
