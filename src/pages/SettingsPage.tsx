import { useState, useEffect, type ReactNode } from 'react';
import {
  Info, Database, Server, Wifi, WifiOff, CircleCheck, CircleX,
  Trash2, Download, Upload, Link2, Key, ShieldCheck, Flame,
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { resetSupabaseClient } from '../lib/supabase';
import { resetFirebaseClient } from '../services/firebase/client';
import {
  refreshConnection, subscribeToConnection, invalidateConnection,
  type ConnectionSnapshot,
} from '../lib/connectionStatus';
import { useToast } from '../hooks/useToast';
import { useTasks } from '../hooks/useTasks';
import type { ConnectionMethod, NeonSslMode } from '../types';

import {
  Badge, Button, InlineError, Input, Modal, PageTitle, Panel,
  SectionHeader, Select, Toolbar, type SelectOption,
} from '../ui';

declare const __APP_GIT_COMMIT__: string;
import { version as appVersion } from '../../package.json';

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
  {
    value: 'neon',
    label: 'Neon DB',
    icon: <Database size={14} />,
    description: 'Neon PostgreSQL through backend/API proxy',
  },
];

const NEON_SSL_OPTIONS: SelectOption<NeonSslMode>[] = [
  { value: 'require', label: 'require' },
  { value: 'prefer', label: 'prefer' },
  { value: 'disable', label: 'disable' },
];

const CONNECTION_TEST_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

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
      <div className="settings-section__body">
        {children}
      </div>
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

  useEffect(() => {
    const unsubscribe = subscribeToConnection(setSnapshot);
    refreshConnection(false).then(setSnapshot);
    return unsubscribe;
  }, []);

  const updateSettings = (updates: Partial<typeof settings>) => {
    updateSettingsRaw(updates);
    resetSupabaseClient();
    resetFirebaseClient();
    invalidateConnection();

    if (updates.connectionMethod) {
      notify(`Метод подключения изменён на ${updates.connectionMethod}`);
    }
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
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && prefixes.some((prefix) => key.startsWith(prefix) || key === prefix)) {
        if (key === 'gd-helper-settings') continue;
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
    if (snapshot.state !== 'offline' || !snapshot.errorKind) return null;

    switch (snapshot.errorKind) {
      case 'config':
        if (settings.connectionMethod === 'supabase') {
          return 'Заполните Supabase URL и anon key.';
        }
        if (settings.connectionMethod === 'postgres') {
          return 'Заполните URL API/proxy для PostgreSQL.';
        }
        return 'Заполните URL backend/API proxy для Neon. Секретный connection string не должен попадать в браузер.';
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
                    onChange={(e) => updateSettings({ supabaseUrl: e.target.value })}
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
                    onChange={(e) => updateSettings({ supabaseAnonKey: e.target.value })}
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
                    onChange={(e) => updateSettings({ postgresUrl: e.target.value })}
                    placeholder="http://localhost:5432"
                    noContainer
                    fullWidth
                    icon={<Link2 size={14} />}
                  />
                </SettingsRow>
                <div className="settings-info">
                  <Info size={14} />
                  <span>Для browser-only режима нужен backend или proxy со стабильным `/tasks` API.</span>
                </div>
              </>
            )}

            {settings.connectionMethod === 'neon' && (
              <>
                <SettingsRow
                  label="Neon API URL"
                  hint="Безопасный backend endpoint или alias. Не connection string."
                >
                  <Input
                    value={settings.neonApiUrl}
                    onChange={(e) => updateSettings({ neonApiUrl: e.target.value })}
                    placeholder="http://localhost:3001/api/db"
                    noContainer
                    fullWidth
                    icon={<Link2 size={14} />}
                  />
                </SettingsRow>
                <SettingsRow
                  label="Neon project"
                  hint="Опционально, для миграции и отображения"
                >
                  <Input
                    value={settings.neonProjectName}
                    onChange={(e) => updateSettings({ neonProjectName: e.target.value })}
                    placeholder="gd-helper-prod"
                    noContainer
                    fullWidth
                    icon={<Database size={14} />}
                  />
                </SettingsRow>
                <SettingsRow
                  label="Neon database"
                  hint="Имя базы PostgreSQL, если нужно различать окружения"
                >
                  <Input
                    value={settings.neonDatabaseName}
                    onChange={(e) => updateSettings({ neonDatabaseName: e.target.value })}
                    placeholder="gd_helper"
                    noContainer
                    fullWidth
                    icon={<Database size={14} />}
                  />
                </SettingsRow>
                <SettingsRow
                  label="SSL mode"
                  hint="Справочное значение для backend proxy"
                >
                  <Select
                    value={settings.neonSslMode}
                    onChange={(value) => updateSettings({ neonSslMode: value })}
                    options={NEON_SSL_OPTIONS}
                    size="sm"
                  />
                </SettingsRow>
                <div className="settings-info">
                  <Info size={14} />
                  <span>Секреты Neon хранятся только на сервере. Браузер использует только API/proxy URL.</span>
                </div>
              </>
            )}

            {settings.connectionMethod === 'firebase' && (
              <>
                <SettingsRow
                  label="API Key"
                  hint="Firebase Web API Key (не секретный)"
                >
                  <Input
                    value={settings.firebaseApiKey}
                    onChange={(e) => updateSettings({ firebaseApiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    noContainer
                    fullWidth
                    icon={<Key size={14} />}
                  />
                </SettingsRow>
                <SettingsRow
                  label="Auth Domain"
                  hint="например, your-project.firebaseapp.com"
                >
                  <Input
                    value={settings.firebaseAuthDomain}
                    onChange={(e) => updateSettings({ firebaseAuthDomain: e.target.value })}
                    placeholder="your-project.firebaseapp.com"
                    noContainer
                    fullWidth
                    icon={<Link2 size={14} />}
                  />
                </SettingsRow>
                <SettingsRow
                  label="Project ID"
                  hint="Идентификатор Firebase проекта"
                >
                  <Input
                    value={settings.firebaseProjectId}
                    onChange={(e) => updateSettings({ firebaseProjectId: e.target.value })}
                    placeholder="your-project-id"
                    noContainer
                    fullWidth
                    icon={<Database size={14} />}
                  />
                </SettingsRow>
                <SettingsRow
                  label="Storage Bucket"
                  hint="Опционально, для хранения файлов"
                >
                  <Input
                    value={settings.firebaseStorageBucket}
                    onChange={(e) => updateSettings({ firebaseStorageBucket: e.target.value })}
                    placeholder="your-project.appspot.com"
                    noContainer
                    fullWidth
                    icon={<Database size={14} />}
                  />
                </SettingsRow>
                <SettingsRow
                  label="Messaging Sender ID"
                  hint="Опционально, для push-уведомлений"
                >
                  <Input
                    value={settings.firebaseMessagingSenderId}
                    onChange={(e) => updateSettings({ firebaseMessagingSenderId: e.target.value })}
                    placeholder="123456789"
                    noContainer
                    fullWidth
                  />
                </SettingsRow>
                <SettingsRow
                  label="App ID"
                  hint="Firebase App ID"
                >
                  <Input
                    value={settings.firebaseAppId}
                    onChange={(e) => updateSettings({ firebaseAppId: e.target.value })}
                    placeholder="1:123456789:web:abc123"
                    noContainer
                    fullWidth
                  />
                </SettingsRow>
                <SettingsRow
                  label="Measurement ID"
                  hint="Опционально, для Google Analytics"
                >
                  <Input
                    value={settings.firebaseMeasurementId}
                    onChange={(e) => updateSettings({ firebaseMeasurementId: e.target.value })}
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
            icon={<Database size={18} />}
            title="Данные"
            description="Управление локальными данными и настройками"
          >
            <SettingsRow
              label="Экспорт настроек"
              hint="Сохранить текущую конфигурацию в JSON файл"
            >
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={14} />}
                onClick={handleExportSettings}
              >
                Экспорт
              </Button>
            </SettingsRow>

            <SettingsRow
              label="Импорт настроек"
              hint="Восстановить конфигурацию из JSON файла"
            >
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
              hint="Удалит сохранённые диаграммы, запросы и локальные сессии. Настройки подключения сохранятся."
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
            icon={<ShieldCheck size={18} />}
            title="Система"
          >
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
            <Button size="sm" onClick={() => setShowResetModal(false)}>Отмена</Button>
            <Button size="sm" variant="danger" onClick={handleClearLocalData}>Очистить</Button>
          </>
        )}
      >
        <p>
          Будут удалены все сохранённые BPMN-диаграммы, API-запросы, локальные сессии и история.
          Настройки подключения сохранятся. Действие необратимо.
        </p>
      </Modal>
    </>
  );
}
