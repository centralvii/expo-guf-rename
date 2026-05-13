import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  ApiRequest,
  ApiResponse,
  ApiKeyValue,
  ApiHistoryEntry,
  HttpMethod,
} from '../types';
import { DEFAULT_API_REQUEST } from '../types';

const STORAGE_KEY = 'gd-helper-api-client';
const MAX_HISTORY = 50;

interface PersistedState {
  collection: ApiRequest[];
  history: ApiHistoryEntry[];
  activeRequestId: string | null;
}

function createEmptyRequest(): ApiRequest {
  const now = Date.now();
  return {
    ...DEFAULT_API_REQUEST,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { collection: [], history: [], activeRequestId: null };
    }
    const parsed = JSON.parse(raw) as PersistedState;
    return {
      collection: parsed.collection ?? [],
      history: parsed.history ?? [],
      activeRequestId: parsed.activeRequestId ?? null,
    };
  } catch {
    return { collection: [], history: [], activeRequestId: null };
  }
}

function saveState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[api-client] failed to persist state', err);
  }
}

function getErrorName(error: unknown): string | undefined {
  return error instanceof Error ? error.name : undefined;
}

function getErrorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

/** Преобразует список ключ-значение в Record, учитывая только enabled */
function kvToRecord(list: ApiKeyValue[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of list) {
    if (item.enabled && item.key.trim()) {
      result[item.key] = item.value;
    }
  }
  return result;
}

/** Строит URL с query-параметрами */
function buildUrl(baseUrl: string, params: ApiKeyValue[]): string {
  const enabled = params.filter((p) => p.enabled && p.key.trim());
  if (enabled.length === 0) return baseUrl;

  try {
    const url = new URL(baseUrl);
    for (const p of enabled) {
      url.searchParams.set(p.key, p.value);
    }
    return url.toString();
  } catch {
    // Если URL некорректный — склеиваем вручную
    const qs = enabled
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${qs}`;
  }
}

/** Применяет auth к headers и URL */
function applyAuth(
  request: ApiRequest,
  headers: Record<string, string>,
  url: string
): { headers: Record<string, string>; url: string } {
  const { auth } = request;

  switch (auth.type) {
    case 'bearer':
      if (auth.bearerToken) {
        headers['Authorization'] = `Bearer ${auth.bearerToken}`;
      }
      break;
    case 'basic':
      if (auth.basicUsername || auth.basicPassword) {
        const encoded = btoa(`${auth.basicUsername ?? ''}:${auth.basicPassword ?? ''}`);
        headers['Authorization'] = `Basic ${encoded}`;
      }
      break;
    case 'api-key':
      if (auth.apiKeyName && auth.apiKeyValue) {
        if (auth.apiKeyIn === 'query') {
          try {
            const u = new URL(url);
            u.searchParams.set(auth.apiKeyName, auth.apiKeyValue);
            url = u.toString();
          } catch {
            const sep = url.includes('?') ? '&' : '?';
            url = `${url}${sep}${encodeURIComponent(auth.apiKeyName)}=${encodeURIComponent(auth.apiKeyValue)}`;
          }
        } else {
          headers[auth.apiKeyName] = auth.apiKeyValue;
        }
      }
      break;
  }

  return { headers, url };
}

/** Формирует body и ставит корректный Content-Type */
function buildBody(
  request: ApiRequest,
  headers: Record<string, string>
): { body: BodyInit | null; headers: Record<string, string> } {
  const { method, bodyType, bodyContent } = request;

  // GET/HEAD не поддерживают тело
  if (method === 'GET' || method === 'HEAD' || bodyType === 'none') {
    return { body: null, headers };
  }

  if (bodyType === 'json') {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return { body: bodyContent, headers };
  }

  if (bodyType === 'text') {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'text/plain';
    }
    return { body: bodyContent, headers };
  }

  if (bodyType === 'form-urlencoded') {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    return { body: bodyContent, headers };
  }

  return { body: null, headers };
}

export interface UseApiClientReturn {
  // State
  tabs: ApiRequest[];
  activeRequestId: string | null;
  activeRequest: ApiRequest | null;
  collection: ApiRequest[];
  history: ApiHistoryEntry[];
  response: ApiResponse | null;
  isLoading: boolean;
  error: string | null;

  // Tabs / requests
  createNewTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateActiveRequest: (updates: Partial<ApiRequest>) => void;

  // Collection
  saveToCollection: () => void;
  loadFromCollection: (id: string) => void;
  removeFromCollection: (id: string) => void;

  // Execution
  sendRequest: () => Promise<void>;
  cancelRequest: () => void;

  // History
  clearHistory: () => void;
  loadFromHistory: (id: string) => void;
}

export function useApiClient(): UseApiClientReturn {
  const [initialState] = useState<{
    tabs: ApiRequest[];
    activeRequestId: string;
    collection: ApiRequest[];
    history: ApiHistoryEntry[];
  }>(() => {
    const saved = loadState();
    const initialTab = createEmptyRequest();
    return {
      tabs: [initialTab],
      activeRequestId: initialTab.id,
      collection: saved.collection,
      history: saved.history,
    };
  });

  const [tabs, setTabs] = useState<ApiRequest[]>(initialState.tabs);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(initialState.activeRequestId);
  const [collection, setCollection] = useState<ApiRequest[]>(initialState.collection);
  const [history, setHistory] = useState<ApiHistoryEntry[]>(initialState.history);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Автосохранение коллекции и истории
  useEffect(() => {
    saveState({ collection, history, activeRequestId });
  }, [collection, history, activeRequestId]);

  const activeRequest = tabs.find((t) => t.id === activeRequestId) ?? null;

  const createNewTab = useCallback(() => {
    const newTab = createEmptyRequest();
    setTabs((prev) => [...prev, newTab]);
    setActiveRequestId(newTab.id);
    setResponse(null);
    setError(null);
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        const fresh = createEmptyRequest();
        setActiveRequestId(fresh.id);
        return [fresh];
      }
      // Если закрыли активную — переключаемся на соседнюю
      if (id === activeRequestId) {
        const idx = prev.findIndex((t) => t.id === id);
        const newActive = next[Math.min(idx, next.length - 1)];
        setActiveRequestId(newActive.id);
      }
      return next;
    });
    setResponse(null);
  }, [activeRequestId]);

  const setActiveTab = useCallback((id: string) => {
    setActiveRequestId(id);
    setResponse(null);
    setError(null);
  }, []);

  const updateActiveRequest = useCallback((updates: Partial<ApiRequest>) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeRequestId
          ? { ...t, ...updates, updatedAt: Date.now() }
          : t
      )
    );
  }, [activeRequestId]);

  const saveToCollection = useCallback(() => {
    if (!activeRequest) return;
    setCollection((prev) => {
      const exists = prev.findIndex((r) => r.id === activeRequest.id);
      if (exists >= 0) {
        const next = [...prev];
        next[exists] = { ...activeRequest, updatedAt: Date.now() };
        return next;
      }
      return [{ ...activeRequest, updatedAt: Date.now() }, ...prev];
    });
  }, [activeRequest]);

  const loadFromCollection = useCallback((id: string) => {
    const req = collection.find((r) => r.id === id);
    if (!req) return;
    // Копируем в таб с тем же id (чтобы можно было сохранять дальше)
    const existingTab = tabs.find((t) => t.id === id);
    if (existingTab) {
      setActiveRequestId(id);
    } else {
      setTabs((prev) => [...prev, { ...req }]);
      setActiveRequestId(id);
    }
    setResponse(null);
    setError(null);
  }, [collection, tabs]);

  const removeFromCollection = useCallback((id: string) => {
    setCollection((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const loadFromHistory = useCallback((id: string) => {
    const entry = history.find((h) => h.id === id);
    if (!entry) return;
    const newTab: ApiRequest = {
      ...createEmptyRequest(),
      name: `${entry.method} ${entry.url}`,
      method: entry.method,
      url: entry.url,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveRequestId(newTab.id);
    setResponse(null);
  }, [history]);

  const sendRequest = useCallback(async () => {
    if (!activeRequest) return;
    if (!activeRequest.url.trim()) {
      setError('URL не указан');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const startTime = performance.now();

    try {
      // Формируем URL с параметрами
      let url = buildUrl(activeRequest.url, activeRequest.params);

      // Формируем headers
      let headers = kvToRecord(activeRequest.headers);

      // Применяем auth
      const authed = applyAuth(activeRequest, headers, url);
      headers = authed.headers;
      url = authed.url;

      // Формируем body
      const built = buildBody(activeRequest, headers);
      headers = built.headers;

      const res = await fetch(url, {
        method: activeRequest.method,
        headers,
        body: built.body,
        signal: controller.signal,
      });

      const responseBody = await res.text();
      const durationMs = Math.round(performance.now() - startTime);

      // Собираем headers ответа
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const apiResponse: ApiResponse = {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        headers: responseHeaders,
        body: responseBody,
        contentType: res.headers.get('content-type') ?? '',
        durationMs,
        sizeBytes: new Blob([responseBody]).size,
        timestamp: Date.now(),
      };

      setResponse(apiResponse);

      // Добавляем в историю
      const historyEntry: ApiHistoryEntry = {
        id: crypto.randomUUID(),
        method: activeRequest.method,
        url: activeRequest.url,
        status: res.status,
        durationMs,
        timestamp: Date.now(),
      };
      setHistory((prev) => [historyEntry, ...prev].slice(0, MAX_HISTORY));
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (getErrorName(err) === 'AbortError') {
        setError('Запрос отменён');
      } else if (message?.includes('Failed to fetch')) {
        setError('Ошибка сети или CORS. Проверьте URL и доступность сервера.');
      } else {
        setError(message ?? 'Неизвестная ошибка');
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [activeRequest]);

  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    tabs,
    activeRequestId,
    activeRequest,
    collection,
    history,
    response,
    isLoading,
    error,
    createNewTab,
    closeTab,
    setActiveTab,
    updateActiveRequest,
    saveToCollection,
    loadFromCollection,
    removeFromCollection,
    sendRequest,
    cancelRequest,
    clearHistory,
    loadFromHistory,
  };
}

export { createEmptyRequest };
export type { HttpMethod };
