import { useState, useEffect, type ReactNode } from 'react';
import {
  Info, Database, Server, Wifi, WifiOff, CircleCheck, CircleX,
  Trash2, Download, Upload, Link2, Key, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { resetSupabaseClient } from '../lib/supabase';
import {
  refreshConnection, subscribeToConnection, invalidateConnection,
  type ConnectionSnapshot,
} from '../lib/connectionStatus';
import { useToast } from '../hooks/useToast';
import { useTasks } from '../hooks/useTasks';

// --- UI-Kit Imports ---
import { Toolbar } from '../ui/Toolbar/Toolbar';
import { Island } from '../ui/Layout/Island';
import { PageTitle } from '../ui/Layout/PageTitle';
import { Button } from '../ui/Button/Button';
import { Input } from '../ui/Input/Input';
import { Select } from '../ui/Select/Select';
import type { SelectOption } from '../ui/Select/Select';
import { Badge } from '../ui/Badge/Badge';
import { Modal } from '../ui/Modal/Modal';

declare const __APP_GIT_COMMIT__: string;

type ConnectionMethod = 'supabase' | 'postgres';

const CONNECTION_OPTIONS: SelectOption<ConnectionMethod>[] = [
  {
    value: 'supabase',
    label: 'Supabase',
    icon: <Server size={14} />,
    description: 'Облачный PostgreSQL с синхронизацией',
  },
  {
    value: 'postgres',
    label: 'Local PostgreSQL',
    icon: <Database size={14} />,
    description: 'Локальная база через прокси',
  },
];

/* ---- Subcomponents ---- */

interface SettingsSectionProps {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}

function SettingsSection({ icon, title, description, children }: SettingsSectionProps) {
  return (
    <Island flex={false} className="settings-section">
      <header className="settings-section__header">
        <div className="settings-section__icon">{icon}</div>
        <div className="settings-section__headings">
          <h3 className="settings-section__title">{title}</h3>
          {description && <p className="settings-section__desc">{description}</p>}
        </div>
      </header>
      <div className="settings-section__body">
        {children}
      </div>
    </Island>
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

/* ---- Main ---- */

export function SettingsPage() {
  const { settings, updateSettings: updateSettingsRaw } = useSettings();
  const { reloadTasks } = useTasks();
  const { notify } = useToast();

  const [snapshot, setSnapshot] = useState<ConnectionSnapshot>({
    state: 'unknown',
    errorKind: null,
    errorMessage: null,
    checkedAt: 0,
  });
  const [isChecking, setIsChecking] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Подписка на глобальный статус + первичная проверка с кэшем
  useEffect(() => {
    const unsubscribe = subscribeToConnection(setSnapshot);
    refreshConnection(false).then(setSnapshot);
    return unsubscribe;
  }, []);

  const updateSettings = (updates: Partial<typeof settings>) => {
    updateSettingsRaw(updates);
    resetSupabaseClient();
    // Сбрасываем кэш статуса — проверка выполнится при следующем клике или из Layout
    invalidateConnection();
    if (updates.connectionMethod) {
      notify(`Метод подключения изменён на ${updates.connectionMethod}`);
    }
  };

  const handleTestConnection = async () => {
    setIsChecking(true);
    try {
      resetSupabaseClient();
      invalidateConnection();
      const snap = await refreshConnection(true);
      setSnapshot(snap);
      if (snap.state === 'online') {
        await reloadTasks();
        notify('Подключение успешно', 'success');
      } else {
        notify(snap.errorMessage ?? 'Не удалось подключиться', 'error');
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleClearLocalData = () => {
    // Очищаем все локальные ключи приложения
    const prefixes = ['gd-helper-', 'bpmn_polygon_diagrams'];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && prefixes.some((p) => key.startsWith(p) || key === p)) {
        // Оставляем настройки подключения
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
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gd-helper-settings.json';
    a.click();
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
    if (snapshot.state === 'unknown') return { variant: 'default' as const, label: 'Проверка...', icon: <Wifi size={12} /> };
    if (snapshot.state === 'online') return { variant: 'success' as const, label: 'Онлайн', icon: <CircleCheck size={12} /> };
    return { variant: 'danger' as const, label: 'Оффлайн', icon: <CircleX size={12} /> };
  })();

  const errorHint = (() => {
    if (snapshot.state !== 'offline' || !snapshot.errorKind) return null;
    switch (snapshot.errorKind) {
      case 'config':
        return 'Заполните URL и ключ Supabase в полях ниже.';
      case 'network':
        return 'Сервер недоступен. Проверьте, что проект Supabase активен и URL корректный.';
      case 'cors':
        return 'CORS блокирует запрос. Добавьте origin в настройки Supabase проекта.';
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
            <Island flex={false} className="settings-error-banner">
              <AlertTriangle size={16} />
              <div className="settings-error-banner__content">
                <span className="settings-error-banner__title">Нет подключения к базе данных</span>
                <span className="settings-error-banner__desc">{errorHint}</span>
              </div>
            </Island>
          )}

          {/* --- Connection --- */}
          <SettingsSection
            icon={<Link2 size={18} />}
            title="Подключение"
            description="Выберите источник данных для задач и заметок"
          >
            <SettingsRow
              label="Метод подключения"
              hint="Где хранятся задачи"
            >
              <Select
                value={settings.connectionMethod}
                onChange={(method) => updateSettings({ connectionMethod: method })}
                options={CONNECTION_OPTIONS}
                size="sm"
              />
            </SettingsRow>

            {settings.connectionMethod === 'supabase' ? (
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
            ) : (
              <>
                <SettingsRow label="PostgreSQL Proxy URL">
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
                  <span>
                    Локальное подключение требует прокси-сервер или совместимый API.
                  </span>
                </div>
              </>
            )}
          </SettingsSection>

          {/* --- Data management --- */}
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
              hint="Удалит сохранённые диаграммы, запросы и сессии (настройки сохранятся)"
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

          {/* --- About --- */}
          <SettingsSection
            icon={<ShieldCheck size={18} />}
            title="Система"
          >
            <SettingsRow label="Версия приложения">
              <span className="settings-value settings-value--mono">1.1.3</span>
            </SettingsRow>
            <SettingsRow label="Git commit">
              <span className="settings-value settings-value--mono">
                {__APP_GIT_COMMIT__}
              </span>
            </SettingsRow>
            <SettingsRow label="Среда">
              <span className="settings-value settings-value--mono">
                {import.meta.env.MODE}
              </span>
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
        footer={
          <>
            <Button size="sm" onClick={() => setShowResetModal(false)}>Отмена</Button>
            <Button size="sm" variant="danger" onClick={handleClearLocalData}>Очистить</Button>
          </>
        }
      >
        <p>
          Будут удалены все сохранённые диаграммы BPMN, запросы API, сессии GUF Packer
          и история. Настройки подключения сохранятся. Действие необратимо.
        </p>
      </Modal>
    </>
  );
}
