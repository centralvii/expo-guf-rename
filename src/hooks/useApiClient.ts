import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ApiCollection,
  ApiEnvironment,
  ApiEnvironmentVariable,
  ApiHistoryEntry,
  ApiKeyValue,
  ApiRequest,
  ApiResponse,
  HttpMethod,
} from '../types';
import { DEFAULT_API_REQUEST } from '../types';
import { findUnresolvedVariables, resolveApiVariables } from '../lib/apiVariables';

const STORAGE_KEY = 'gd-helper-api-client';
const MAX_HISTORY = 50;

interface PersistedState {
  collection: ApiRequest[];
  collections: ApiCollection[];
  history: ApiHistoryEntry[];
  environments: ApiEnvironment[];
  activeRequestId: string | null;
  activeEnvironmentId: string | null;
}

function createEnvironmentVariable(
  key: string,
  value = '',
  options?: { secret?: boolean }
): ApiEnvironmentVariable {
  return {
    id: crypto.randomUUID(),
    key,
    value,
    enabled: true,
    secret: options?.secret,
  };
}

function createDefaultEnvironments(): ApiEnvironment[] {
  const now = Date.now();
  const createEnvironment = (
    id: string,
    name: string,
    isActive = false
  ): ApiEnvironment => ({
    id,
    name,
    isActive,
    createdAt: now,
    updatedAt: now,
    variables: [
      createEnvironmentVariable('baseUrl'),
      createEnvironmentVariable('token', '', { secret: true }),
      createEnvironmentVariable('taskId'),
      createEnvironmentVariable('cardId'),
    ],
  });

  return [
    createEnvironment('local', 'local', true),
    createEnvironment('dev', 'dev'),
    createEnvironment('test', 'test'),
    createEnvironment('prod', 'prod'),
  ];
}

function createDefaultCollections(): ApiCollection[] {
  return [
    {
      id: 'default',
      name: 'Default',
      description: 'Default request collection',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
}

function createEmptyRequest(): ApiRequest {
  const now = Date.now();
  return {
    ...DEFAULT_API_REQUEST,
    id: crypto.randomUUID(),
    environmentId: 'local',
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeEnvironments(environments?: ApiEnvironment[], activeEnvironmentId?: string | null) {
  const defaults = createDefaultEnvironments();

  if (!environments || environments.length === 0) {
    return {
      environments: defaults,
      activeEnvironmentId: 'local',
    };
  }

  const nextEnvironments = environments.map((environment) => ({
    ...environment,
    variables: environment.variables ?? [],
  }));
  const fallbackActiveId = activeEnvironmentId && nextEnvironments.some((environment) => environment.id === activeEnvironmentId)
    ? activeEnvironmentId
    : nextEnvironments.find((environment) => environment.isActive)?.id ?? nextEnvironments[0]?.id ?? 'local';

  return {
    environments: nextEnvironments.map((environment) => ({
      ...environment,
      isActive: environment.id === fallbackActiveId,
    })),
    activeEnvironmentId: fallbackActiveId,
  };
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        collection: [],
        collections: createDefaultCollections(),
        history: [],
        environments: createDefaultEnvironments(),
        activeRequestId: null,
        activeEnvironmentId: 'local',
      };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const normalizedEnvironments = normalizeEnvironments(
      parsed.environments,
      parsed.activeEnvironmentId ?? null
    );

    return {
      collection: parsed.collection ?? [],
      collections: parsed.collections?.length ? parsed.collections : createDefaultCollections(),
      history: parsed.history ?? [],
      environments: normalizedEnvironments.environments,
      activeRequestId: parsed.activeRequestId ?? null,
      activeEnvironmentId: normalizedEnvironments.activeEnvironmentId,
    };
  } catch {
    return {
      collection: [],
      collections: createDefaultCollections(),
      history: [],
      environments: createDefaultEnvironments(),
      activeRequestId: null,
      activeEnvironmentId: 'local',
    };
  }
}

function saveState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[api-client] failed to persist state', error);
  }
}

function getErrorName(error: unknown): string | undefined {
  return error instanceof Error ? error.name : undefined;
}

function getErrorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

function kvToRecord(list: ApiKeyValue[]): Record<string, string> {
  return list.reduce<Record<string, string>>((result, item) => {
    if (item.enabled && item.key.trim()) {
      result[item.key] = item.value;
    }
    return result;
  }, {});
}

function buildUrl(baseUrl: string, params: ApiKeyValue[]): string {
  const enabled = params.filter((param) => param.enabled && param.key.trim());
  if (enabled.length === 0) {
    return baseUrl;
  }

  try {
    const url = new URL(baseUrl);
    enabled.forEach((param) => {
      url.searchParams.set(param.key, param.value);
    });
    return url.toString();
  } catch {
    const queryString = enabled
      .map((param) => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`)
      .join('&');
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${queryString}`;
  }
}

function applyAuth(
  request: ApiRequest,
  headers: Record<string, string>,
  url: string
): { headers: Record<string, string>; url: string } {
  const { auth } = request;

  switch (auth.type) {
    case 'bearer':
      if (auth.bearerToken) {
        headers.Authorization = `Bearer ${auth.bearerToken}`;
      }
      break;
    case 'basic':
      if (auth.basicUsername || auth.basicPassword) {
        const encoded = btoa(`${auth.basicUsername ?? ''}:${auth.basicPassword ?? ''}`);
        headers.Authorization = `Basic ${encoded}`;
      }
      break;
    case 'api-key':
      if (auth.apiKeyName && auth.apiKeyValue) {
        if (auth.apiKeyIn === 'query') {
          try {
            const nextUrl = new URL(url);
            nextUrl.searchParams.set(auth.apiKeyName, auth.apiKeyValue);
            url = nextUrl.toString();
          } catch {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}${encodeURIComponent(auth.apiKeyName)}=${encodeURIComponent(auth.apiKeyValue)}`;
          }
        } else {
          headers[auth.apiKeyName] = auth.apiKeyValue;
        }
      }
      break;
    default:
      break;
  }

  return { headers, url };
}

function buildBody(
  request: ApiRequest,
  headers: Record<string, string>
): { body: BodyInit | null; headers: Record<string, string> } {
  const { method, bodyType, bodyContent } = request;

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

function resolveRequestWithEnvironment(request: ApiRequest, environment: ApiEnvironment | null) {
  const resolveText = (text: string) => resolveApiVariables({ text, environment, task: null });

  return {
    ...request,
    url: resolveText(request.url),
    params: request.params.map((param) => ({
      ...param,
      key: resolveText(param.key),
      value: resolveText(param.value),
    })),
    headers: request.headers.map((header) => ({
      ...header,
      key: resolveText(header.key),
      value: resolveText(header.value),
    })),
    auth: {
      ...request.auth,
      bearerToken: request.auth.bearerToken ? resolveText(request.auth.bearerToken) : request.auth.bearerToken,
      basicUsername: request.auth.basicUsername ? resolveText(request.auth.basicUsername) : request.auth.basicUsername,
      basicPassword: request.auth.basicPassword ? resolveText(request.auth.basicPassword) : request.auth.basicPassword,
      apiKeyName: request.auth.apiKeyName ? resolveText(request.auth.apiKeyName) : request.auth.apiKeyName,
      apiKeyValue: request.auth.apiKeyValue ? resolveText(request.auth.apiKeyValue) : request.auth.apiKeyValue,
    },
    bodyContent: resolveText(request.bodyContent),
  };
}

export interface UseApiClientReturn {
  tabs: ApiRequest[];
  activeRequestId: string | null;
  activeRequest: ApiRequest | null;
  collection: ApiRequest[];
  collections: ApiCollection[];
  history: ApiHistoryEntry[];
  environments: ApiEnvironment[];
  activeEnvironment: ApiEnvironment | null;
  unresolvedVariables: string[];
  response: ApiResponse | null;
  isLoading: boolean;
  error: string | null;
  createNewTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateActiveRequest: (updates: Partial<ApiRequest>) => void;
  saveToCollection: () => void;
  loadFromCollection: (id: string) => void;
  removeFromCollection: (id: string) => void;
  sendRequest: () => Promise<void>;
  cancelRequest: () => void;
  clearHistory: () => void;
  loadFromHistory: (id: string) => void;
  setActiveEnvironment: (id: string) => void;
  upsertEnvironment: (environment: ApiEnvironment) => void;
  deleteEnvironment: (id: string) => void;
}

export function useApiClient(): UseApiClientReturn {
  const [initialState] = useState(() => {
    const saved = loadState();
    const initialTab = createEmptyRequest();

    return {
      tabs: [initialTab],
      activeRequestId: initialTab.id,
      collection: saved.collection,
      collections: saved.collections,
      history: saved.history,
      environments: saved.environments,
      activeEnvironmentId: saved.activeEnvironmentId,
    };
  });

  const [tabs, setTabs] = useState<ApiRequest[]>(initialState.tabs);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(initialState.activeRequestId);
  const [collection, setCollection] = useState<ApiRequest[]>(initialState.collection);
  const [collections] = useState<ApiCollection[]>(initialState.collections);
  const [history, setHistory] = useState<ApiHistoryEntry[]>(initialState.history);
  const [environments, setEnvironments] = useState<ApiEnvironment[]>(initialState.environments);
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(initialState.activeEnvironmentId);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    saveState({
      collection,
      collections,
      history,
      environments,
      activeRequestId,
      activeEnvironmentId,
    });
  }, [collection, collections, history, environments, activeRequestId, activeEnvironmentId]);

  const activeRequest = tabs.find((tab) => tab.id === activeRequestId) ?? null;
  const activeEnvironment = environments.find((environment) => environment.id === activeEnvironmentId) ?? null;

  const unresolvedVariables = useMemo(() => {
    if (!activeRequest) {
      return [];
    }

    const fields = [
      activeRequest.url,
      activeRequest.bodyContent,
      ...activeRequest.params.flatMap((param) => [param.key, param.value]),
      ...activeRequest.headers.flatMap((header) => [header.key, header.value]),
      activeRequest.auth.bearerToken ?? '',
      activeRequest.auth.basicUsername ?? '',
      activeRequest.auth.basicPassword ?? '',
      activeRequest.auth.apiKeyName ?? '',
      activeRequest.auth.apiKeyValue ?? '',
    ];

    const resolvedFields = fields.map((field) => resolveApiVariables({
      text: field,
      environment: activeEnvironment,
      task: null,
    }));

    return Array.from(new Set(resolvedFields.flatMap((field) => findUnresolvedVariables(field))));
  }, [activeEnvironment, activeRequest]);

  const createNewTab = useCallback(() => {
    const newTab = createEmptyRequest();
    setTabs((prev) => [...prev, newTab]);
    setActiveRequestId(newTab.id);
    setResponse(null);
    setError(null);
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const next = prev.filter((tab) => tab.id !== id);

      if (next.length === 0) {
        const fresh = createEmptyRequest();
        setActiveRequestId(fresh.id);
        return [fresh];
      }

      if (id === activeRequestId) {
        const closedIndex = prev.findIndex((tab) => tab.id === id);
        const nextActive = next[Math.min(closedIndex, next.length - 1)];
        setActiveRequestId(nextActive.id);
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
      prev.map((tab) => (
        tab.id === activeRequestId
          ? { ...tab, ...updates, updatedAt: Date.now() }
          : tab
      ))
    );
  }, [activeRequestId]);

  const saveToCollection = useCallback(() => {
    if (!activeRequest) {
      return;
    }

    setCollection((prev) => {
      const existingIndex = prev.findIndex((request) => request.id === activeRequest.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = { ...activeRequest, updatedAt: Date.now() };
        return next;
      }

      return [{ ...activeRequest, updatedAt: Date.now() }, ...prev];
    });
  }, [activeRequest]);

  const loadFromCollection = useCallback((id: string) => {
    const request = collection.find((item) => item.id === id);
    if (!request) {
      return;
    }

    const existingTab = tabs.find((tab) => tab.id === id);
    if (existingTab) {
      setActiveRequestId(id);
    } else {
      setTabs((prev) => [...prev, { ...request }]);
      setActiveRequestId(id);
    }

    if (request.environmentId) {
      setActiveEnvironmentId(request.environmentId);
    }

    setResponse(null);
    setError(null);
  }, [collection, tabs]);

  const removeFromCollection = useCallback((id: string) => {
    setCollection((prev) => prev.filter((request) => request.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const loadFromHistory = useCallback((id: string) => {
    const entry = history.find((item) => item.id === id);
    if (!entry) {
      return;
    }

    const newTab: ApiRequest = {
      ...createEmptyRequest(),
      name: `${entry.method} ${entry.url}`,
      method: entry.method,
      url: entry.url,
      linkedTaskId: entry.linkedTaskId,
      environmentId: entry.environmentId ?? activeEnvironmentId ?? 'local',
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveRequestId(newTab.id);
    if (newTab.environmentId) {
      setActiveEnvironmentId(newTab.environmentId);
    }
    setResponse(null);
  }, [activeEnvironmentId, history]);

  const setActiveEnvironment = useCallback((id: string) => {
    setActiveEnvironmentId(id);
    setEnvironments((prev) => prev.map((environment) => ({
      ...environment,
      isActive: environment.id === id,
    })));
    updateActiveRequest({ environmentId: id });
  }, [updateActiveRequest]);

  const upsertEnvironment = useCallback((environment: ApiEnvironment) => {
    setEnvironments((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === environment.id);
      const nextEnvironment = {
        ...environment,
        updatedAt: Date.now(),
      };

      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = nextEnvironment;
        return next;
      }

      return [...prev, nextEnvironment];
    });
  }, []);

  const deleteEnvironment = useCallback((id: string) => {
    setEnvironments((prev) => {
      const next = prev.filter((environment) => environment.id !== id);
      if (next.length === 0) {
        return createDefaultEnvironments();
      }
      return next;
    });

    setActiveEnvironmentId((prev) => {
      if (prev !== id) {
        return prev;
      }
      return 'local';
    });
  }, []);

  const sendRequest = useCallback(async () => {
    if (!activeRequest) {
      return;
    }

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
    const resolvedRequest = resolveRequestWithEnvironment(
      {
        ...activeRequest,
        environmentId: activeRequest.environmentId ?? activeEnvironment?.id ?? undefined,
      },
      activeEnvironment
    );

    try {
      let url = buildUrl(resolvedRequest.url, resolvedRequest.params);
      let headers = kvToRecord(resolvedRequest.headers);

      const authedRequest = applyAuth(resolvedRequest, headers, url);
      headers = authedRequest.headers;
      url = authedRequest.url;

      const builtRequest = buildBody(resolvedRequest, headers);
      headers = builtRequest.headers;

      const result = await fetch(url, {
        method: resolvedRequest.method,
        headers,
        body: builtRequest.body,
        signal: controller.signal,
      });

      const responseBody = await result.text();
      const durationMs = Math.round(performance.now() - startTime);

      const responseHeaders: Record<string, string> = {};
      result.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const apiResponse: ApiResponse = {
        status: result.status,
        statusText: result.statusText,
        ok: result.ok,
        headers: responseHeaders,
        body: responseBody,
        contentType: result.headers.get('content-type') ?? '',
        durationMs,
        sizeBytes: new Blob([responseBody]).size,
        timestamp: Date.now(),
      };

      setResponse(apiResponse);

      const historyEntry: ApiHistoryEntry = {
        id: crypto.randomUUID(),
        requestId: activeRequest.id,
        linkedTaskId: activeRequest.linkedTaskId,
        environmentId: activeEnvironment?.id ?? activeRequest.environmentId,
        method: activeRequest.method,
        url: activeRequest.url,
        resolvedUrl: url,
        status: result.status,
        durationMs,
        timestamp: Date.now(),
      };

      setHistory((prev) => [historyEntry, ...prev].slice(0, MAX_HISTORY));
    } catch (error) {
      const message = getErrorMessage(error);
      let nextErrorMessage = message ?? 'Unknown error';

      if (getErrorName(error) === 'AbortError') {
        nextErrorMessage = 'Запрос отменён';
      } else if (message?.includes('Failed to fetch')) {
        nextErrorMessage = 'Ошибка сети или CORS. Проверьте URL и доступность сервера.';
      }

      setError(nextErrorMessage);

      const durationMs = Math.round(performance.now() - startTime);
      const historyEntry: ApiHistoryEntry = {
        id: crypto.randomUUID(),
        requestId: activeRequest.id,
        linkedTaskId: activeRequest.linkedTaskId,
        environmentId: activeEnvironment?.id ?? activeRequest.environmentId,
        method: activeRequest.method,
        url: activeRequest.url,
        resolvedUrl: resolvedRequest.url,
        status: 0,
        durationMs,
        timestamp: Date.now(),
        errorMessage: nextErrorMessage,
      };
      setHistory((prev) => [historyEntry, ...prev].slice(0, MAX_HISTORY));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [activeEnvironment, activeRequest]);

  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    tabs,
    activeRequestId,
    activeRequest,
    collection,
    collections,
    history,
    environments,
    activeEnvironment,
    unresolvedVariables,
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
    setActiveEnvironment,
    upsertEnvironment,
    deleteEnvironment,
  };
}

export { createEmptyRequest };
export type { HttpMethod };
