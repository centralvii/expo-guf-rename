import { memo } from 'react';
import { Database, Flame, Key, Link2, Server } from 'lucide-react';
import { Input, Select, SettingsRow } from '../../ui';
import type { AppSettings, ConnectionMethod } from '../../types';

const CONNECTION_OPTIONS: { value: ConnectionMethod; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'supabase', label: 'Supabase', icon: <Server size={14} />, description: 'Hosted PostgreSQL with browser-safe anon access' },
  { value: 'firebase', label: 'Firebase', icon: <Flame size={14} />, description: 'Google Firebase Firestore for data storage' },
  { value: 'postgres', label: 'PostgreSQL', icon: <Database size={14} />, description: 'Local or remote PostgreSQL through API/proxy' },
];

interface ConnectionSectionProps { settings: AppSettings; onUpdate: (updates: Partial<AppSettings>) => void; }

function ConnectionSection_({ settings, onUpdate }: ConnectionSectionProps) {
  return (
    <div className="settings-section__body">
      <SettingsRow label="Метод подключения" hint="Как приложение работает с базой данных">
        <Select value={settings.connectionMethod} onChange={(method) => onUpdate({ connectionMethod: method })} options={CONNECTION_OPTIONS} size="sm" />
      </SettingsRow>
      {settings.connectionMethod === 'supabase' && (
        <>
          <SettingsRow label="Supabase URL"><Input value={settings.supabaseUrl} onChange={(e) => onUpdate({ supabaseUrl: e.target.value })} placeholder="https://xyz.supabase.co" noContainer fullWidth icon={<Link2 size={14} />} /></SettingsRow>
          <SettingsRow label="Supabase Anon Key"><Input type="password" value={settings.supabaseAnonKey} onChange={(e) => onUpdate({ supabaseAnonKey: e.target.value })} placeholder="eyJhbG..." noContainer fullWidth icon={<Key size={14} />} /></SettingsRow>
        </>
      )}
      {settings.connectionMethod === 'postgres' && (
        <>
          <SettingsRow label="PostgreSQL Proxy URL" hint="Frontend должен ходить в API/proxy, а не напрямую в PostgreSQL">
            <Input value={settings.postgresUrl} onChange={(e) => onUpdate({ postgresUrl: e.target.value })} placeholder="http://localhost:5432" noContainer fullWidth icon={<Link2 size={14} />} />
          </SettingsRow>
          <div className="settings-info"><span>Для browser-only режима нужен backend или proxy со стабильным /tasks API.</span></div>
        </>
      )}
      {settings.connectionMethod === 'firebase' && (
        <>
          <SettingsRow label="API Key" hint="Firebase Web API Key (не секретный)"><Input value={settings.firebaseApiKey} onChange={(e) => onUpdate({ firebaseApiKey: e.target.value })} placeholder="AIzaSy..." noContainer fullWidth icon={<Key size={14} />} /></SettingsRow>
          <SettingsRow label="Auth Domain" hint="your-project.firebaseapp.com"><Input value={settings.firebaseAuthDomain} onChange={(e) => onUpdate({ firebaseAuthDomain: e.target.value.trim() })} placeholder="your-project.firebaseapp.com" noContainer fullWidth icon={<Link2 size={14} />} pattern="^[a-z0-9-]+\.firebaseapp\.com$" title="Используйте домен вида your-project.firebaseapp.com" /></SettingsRow>
          <SettingsRow label="Project ID"><Input value={settings.firebaseProjectId} onChange={(e) => onUpdate({ firebaseProjectId: e.target.value.trim() })} placeholder="your-project-id" noContainer fullWidth icon={<Database size={14} />} pattern="^[a-z0-9-]+$" title="Project ID должен содержать только строчные буквы, цифры и дефисы" /></SettingsRow>
          <SettingsRow label="Storage Bucket" hint="Опционально"><Input value={settings.firebaseStorageBucket} onChange={(e) => onUpdate({ firebaseStorageBucket: e.target.value.trim() })} placeholder="your-project.appspot.com" noContainer fullWidth icon={<Database size={14} />} pattern="^$|^[a-z0-9.-]+$" title="Bucket должен быть пустым или содержать корректное имя хранилища" /></SettingsRow>
          <SettingsRow label="Messaging Sender ID" hint="Опционально"><Input value={settings.firebaseMessagingSenderId} onChange={(e) => onUpdate({ firebaseMessagingSenderId: e.target.value.trim() })} placeholder="123456789" noContainer fullWidth inputMode="numeric" pattern="^$|^[0-9]+$" title="Sender ID должен содержать только цифры" /></SettingsRow>
          <SettingsRow label="App ID"><Input value={settings.firebaseAppId} onChange={(e) => onUpdate({ firebaseAppId: e.target.value.trim() })} placeholder="1:123456789:web:abc123" noContainer fullWidth pattern="^[0-9]+:[0-9]+:web:[A-Za-z0-9]+$" title="App ID должен быть в формате 1:123456789:web:abc123" /></SettingsRow>
          <SettingsRow label="Measurement ID" hint="Опционально"><Input value={settings.firebaseMeasurementId} onChange={(e) => onUpdate({ firebaseMeasurementId: e.target.value.trim() })} placeholder="G-XXXXXXXXXX" noContainer fullWidth pattern="^$|^G-[A-Z0-9]+$" title="Measurement ID должен быть в формате G-XXXXXXXXXX" /></SettingsRow>
          <div className="settings-info"><span>Настройки Firebase безопасны для frontend. Доступ к данным контролируется Firebase Security Rules.</span></div>
        </>
      )}
    </div>
  );
}

export const ConnectionSection = memo(ConnectionSection_);
