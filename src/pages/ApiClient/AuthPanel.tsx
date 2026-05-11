import { memo } from 'react';
import type { ApiAuthConfig, ApiAuthType } from '../../types';
import { Input } from '../../ui/Input/Input';

interface AuthPanelProps {
  auth: ApiAuthConfig;
  onChange: (auth: ApiAuthConfig) => void;
}

const AUTH_TYPES: { value: ApiAuthType; label: string }[] = [
  { value: 'none', label: 'Без авторизации' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'api-key', label: 'API Key' },
];

export const AuthPanel = memo(function AuthPanel({ auth, onChange }: AuthPanelProps) {
  const update = (updates: Partial<ApiAuthConfig>) => {
    onChange({ ...auth, ...updates });
  };

  return (
    <div className="auth-panel">
      <div className="auth-panel__type-group">
        {AUTH_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`auth-panel__type ${auth.type === t.value ? 'auth-panel__type--active' : ''}`}
            onClick={() => update({ type: t.value })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {auth.type === 'bearer' && (
        <div className="auth-panel__fields">
          <Input
            label="Token"
            type="password"
            value={auth.bearerToken ?? ''}
            onChange={(e) => update({ bearerToken: e.target.value })}
            placeholder="eyJhbG..."
            fullWidth
          />
        </div>
      )}

      {auth.type === 'basic' && (
        <div className="auth-panel__fields auth-panel__fields--two-col">
          <Input
            label="Username"
            value={auth.basicUsername ?? ''}
            onChange={(e) => update({ basicUsername: e.target.value })}
            placeholder="admin"
            fullWidth
          />
          <Input
            label="Password"
            type="password"
            value={auth.basicPassword ?? ''}
            onChange={(e) => update({ basicPassword: e.target.value })}
            placeholder="••••••••"
            fullWidth
          />
        </div>
      )}

      {auth.type === 'api-key' && (
        <div className="auth-panel__fields">
          <div className="auth-panel__fields--two-col">
            <Input
              label="Ключ"
              value={auth.apiKeyName ?? ''}
              onChange={(e) => update({ apiKeyName: e.target.value })}
              placeholder="X-API-Key"
              fullWidth
            />
            <Input
              label="Значение"
              type="password"
              value={auth.apiKeyValue ?? ''}
              onChange={(e) => update({ apiKeyValue: e.target.value })}
              placeholder="secret_token"
              fullWidth
            />
          </div>
          <div className="auth-panel__in-group">
            <span className="ui-label">Передавать в:</span>
            <button
              type="button"
              className={`auth-panel__type ${auth.apiKeyIn !== 'query' ? 'auth-panel__type--active' : ''}`}
              onClick={() => update({ apiKeyIn: 'header' })}
            >
              Header
            </button>
            <button
              type="button"
              className={`auth-panel__type ${auth.apiKeyIn === 'query' ? 'auth-panel__type--active' : ''}`}
              onClick={() => update({ apiKeyIn: 'query' })}
            >
              Query
            </button>
          </div>
        </div>
      )}

      {auth.type === 'none' && (
        <p className="auth-panel__empty">Запрос будет отправлен без авторизации.</p>
      )}
    </div>
  );
});
