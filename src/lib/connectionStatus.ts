import { checkConnection } from './taskRepository';

export type ConnectionState = 'unknown' | 'online' | 'offline';
export type ConnectionErrorKind = 'config' | 'network' | 'cors' | 'api' | null;

export interface ConnectionSnapshot {
  state: ConnectionState;
  errorKind: ConnectionErrorKind;
  errorMessage: string | null;
  checkedAt: number;
}

const CACHE_TTL = 15_000;

let current: ConnectionSnapshot = {
  state: 'unknown',
  errorKind: null,
  errorMessage: null,
  checkedAt: 0,
};

let inFlightCheck: Promise<ConnectionSnapshot> | null = null;

const listeners = new Set<(snap: ConnectionSnapshot) => void>();

function notify() {
  for (const fn of listeners) fn(current);
}

function classifyError(err: unknown): { kind: ConnectionErrorKind; message: string } {
  if (!err) return { kind: null, message: '' };
  const msg = err instanceof Error ? err.message : String(err);

  if (/configuration is missing|proxy url is missing|api url is missing|configure a backend proxy|firebase is not configured/i.test(msg)) {
    return { kind: 'config', message: 'Настройки подключения не заполнены' };
  }
  if (/failed to fetch|networkerror|load failed|http2|ping/i.test(msg)) {
    return { kind: 'network', message: 'Сетевая ошибка. Проверьте URL и доступность сервера' };
  }
  if (/cors/i.test(msg)) {
    return { kind: 'cors', message: 'CORS блокирует запрос. Проверьте настройки сервера' };
  }
  return { kind: 'api', message: msg };
}

export function getConnectionSnapshot(): ConnectionSnapshot {
  return current;
}

export function subscribeToConnection(listener: (snap: ConnectionSnapshot) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function invalidateConnection() {
  current = { state: 'unknown', errorKind: null, errorMessage: null, checkedAt: 0 };
  notify();
}

export async function refreshConnection(force = false): Promise<ConnectionSnapshot> {
  const now = Date.now();
  if (!force && current.state !== 'unknown' && now - current.checkedAt < CACHE_TTL) {
    return current;
  }

  if (inFlightCheck) {
    return inFlightCheck;
  }

  inFlightCheck = (async () => {
    try {
      const ok = await checkConnection();
      current = {
        state: ok ? 'online' : 'offline',
        errorKind: ok ? null : 'api',
        errorMessage: ok ? null : 'Сервер вернул ошибку',
        checkedAt: Date.now(),
      };
    } catch (err) {
      const { kind, message } = classifyError(err);
      current = {
        state: 'offline',
        errorKind: kind,
        errorMessage: message,
        checkedAt: Date.now(),
      };
    } finally {
      inFlightCheck = null;
    }

    notify();
    return current;
  })();

  return inFlightCheck;
}
