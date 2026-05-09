import { Info, ShieldCheck, Database, Server } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { resetSupabaseClient } from '../lib/supabase';
import { useToast } from '../hooks/useToast';

export function SettingsPage() {
  const { settings, updateSettings: updateSettingsRaw } = useSettings();
  const { notify } = useToast();

  const updateSettings = (updates: any) => {
    updateSettingsRaw(updates);
    resetSupabaseClient();
    if (updates.connectionMethod) {
      notify(`Метод подключения изменен на ${updates.connectionMethod}`);
    }
  };

  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content">

        <div className="settings-grid" style={{ display: 'grid', gap: '24px' }}>
          {/* Connection Settings */}
          <section className="settings-section card" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', fontSize: '16px' }}>
              <Database size={18} />
              Подключение к базе данных
            </h3>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Метод подключения</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className={`btn ${settings.connectionMethod === 'supabase' ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => updateSettings({ connectionMethod: 'supabase' })}
                  style={{ flex: 1 }}
                >
                  <Server size={16} style={{ marginRight: '8px' }} />
                  Supabase
                </button>
                <button
                  className={`btn ${settings.connectionMethod === 'postgres' ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => updateSettings({ connectionMethod: 'postgres' })}
                  style={{ flex: 1 }}
                >
                  <Database size={16} style={{ marginRight: '8px' }} />
                  Local PostgreSQL
                </button>
              </div>
            </div>

            {settings.connectionMethod === 'supabase' ? (
              <div className="connection-details anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>Supabase URL</label>
                  <input
                    type="text"
                    className="text-input"
                    value={settings.supabaseUrl}
                    onChange={(e) => updateSettings({ supabaseUrl: e.target.value })}
                    placeholder="https://xyz.supabase.co"
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>Supabase Anon Key</label>
                  <input
                    type="password"
                    className="text-input"
                    value={settings.supabaseAnonKey}
                    onChange={(e) => updateSettings({ supabaseAnonKey: e.target.value })}
                    placeholder="eyJhbG..."
                  />
                </div>
              </div>
            ) : (
              <div className="connection-details anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>PostgreSQL Proxy/API URL</label>
                  <input
                    type="text"
                    className="text-input"
                    value={settings.postgresUrl}
                    onChange={(e) => updateSettings({ postgresUrl: e.target.value })}
                    placeholder="http://localhost:5432"
                  />
                </div>
                <div style={{ padding: '12px', background: 'var(--bg-muted)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <Info size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Локальное подключение требует запущенного прокси-сервера или API, совместимого с протоколом.
                </div>
              </div>
            )}
          </section>

          <section className="settings-section card" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', fontSize: '16px' }}>
              <ShieldCheck size={18} />
              О приложении
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Версия:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>1.1.3 release</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Среда:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{import.meta.env.MODE}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
