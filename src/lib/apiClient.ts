import type { ApiEnvironment, ApiEnvironmentVariable, ApiKeyValue, ApiRequest, ApiResponse } from '../types';
import { DEFAULT_API_REQUEST } from '../types';
import { resolveApiVariables } from './apiVariables';

const STORAGE_KEY = 'gd-helper-api-client';
const DB_NAME = 'gd-helper-api-client';
const DB_VERSION = 1;
const DB_STORE = 'state';
const MAX_HISTORY = 50;

/* ---------- State shape ---------- */

export interface ApiClientPersistedState {
  collection: ApiRequest[];
  collections: ApiCollection[];
  history: ApiHistoryEntry[];
  environments: ApiEnvironment[];
  activeRequestId: string | null;
  activeEnvironmentId: string | null;
}

interface ApiCollection { id: string; name: string; description: string; createdAt: number; updatedAt: number; }
interface ApiHistoryEntry { id: string; requestId: string; linkedTaskId?: string; environmentId?: string; method: string; url: string; resolvedUrl: string; status: number; durationMs: number; timestamp: number; errorMessage?: string; }

/* ---------- Factory functions ---------- */

export function createEnvironmentVariable(key: string, value = '', options?: { secret?: boolean }): ApiEnvironmentVariable {
  return { id: crypto.randomUUID(), key, value, enabled: true, secret: options?.secret };
}

export function createDefaultEnvironments(): ApiEnvironment[] {
  const now = Date.now();
  return [
    { id: 'local', name: 'local', isActive: true, createdAt: now, updatedAt: now, variables: [createEnvironmentVariable('baseUrl'), createEnvironmentVariable('token', '', { secret: true }), createEnvironmentVariable('taskId'), createEnvironmentVariable('cardId')] },
    { id: 'dev', name: 'dev', isActive: false, createdAt: now, updatedAt: now, variables: [createEnvironmentVariable('baseUrl'), createEnvironmentVariable('token', '', { secret: true }), createEnvironmentVariable('taskId'), createEnvironmentVariable('cardId')] },
    { id: 'test', name: 'test', isActive: false, createdAt: now, updatedAt: now, variables: [createEnvironmentVariable('baseUrl'), createEnvironmentVariable('token', '', { secret: true }), createEnvironmentVariable('taskId'), createEnvironmentVariable('cardId')] },
    { id: 'prod', name: 'prod', isActive: false, createdAt: now, updatedAt: now, variables: [createEnvironmentVariable('baseUrl'), createEnvironmentVariable('token', '', { secret: true }), createEnvironmentVariable('taskId'), createEnvironmentVariable('cardId')] },
  ];
}

export function createDefaultCollections(): ApiCollection[] {
  const now = Date.now();
  return [{ id: 'default', name: 'Default', description: 'Default request collection', createdAt: now, updatedAt: now }];
}

export function createEmptyRequest(): ApiRequest {
  const now = Date.now();
  return { ...DEFAULT_API_REQUEST, id: crypto.randomUUID(), environmentId: 'local', createdAt: now, updatedAt: now };
}

/* ---------- State normalization ---------- */

export function normalizeEnvironments(environments?: ApiEnvironment[], activeEnvironmentId?: string | null) {
  const defaults = createDefaultEnvironments();
  if (!environments || environments.length === 0) return { environments: defaults, activeEnvironmentId: 'local' };

  const nextEnvironments = environments.map((env) => ({ ...env, variables: env.variables ?? [] }));
  const fallbackActiveId = activeEnvironmentId && nextEnvironments.some((env) => env.id === activeEnvironmentId)
    ? activeEnvironmentId
    : nextEnvironments.find((env) => env.isActive)?.id ?? nextEnvironments[0]?.id ?? 'local';

  return {
    environments: nextEnvironments.map((env) => ({ ...env, isActive: env.id === fallbackActiveId })),
    activeEnvironmentId: fallbackActiveId,
  };
}

/* ---------- IndexedDB persistence ---------- */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) {
        req.result.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function normalize(raw: Partial<ApiClientPersistedState>): ApiClientPersistedState {
  const normalized = normalizeEnvironments(raw.environments, raw.activeEnvironmentId ?? null);
  return {
    collection: raw.collection ?? [],
    collections: raw.collections?.length ? raw.collections : createDefaultCollections(),
    history: raw.history ?? [],
    environments: normalized.environments,
    activeRequestId: raw.activeRequestId ?? null,
    activeEnvironmentId: normalized.activeEnvironmentId,
  };
}

function getDefaultState(): ApiClientPersistedState {
  return {
    collection: [], collections: createDefaultCollections(), history: [],
    environments: createDefaultEnvironments(), activeRequestId: null, activeEnvironmentId: 'local',
  };
}

export async function loadApiClientState(): Promise<ApiClientPersistedState> {
  try {
    // Try IndexedDB first
    const db = await openDb();
    const saved = await idbGet<ApiClientPersistedState>(db, STORAGE_KEY);
    db.close();
    if (saved) return saved;

    // Fallback: migrate from localStorage
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ApiClientPersistedState>;
      const state = normalize(parsed);
      // Write to IndexedDB for next time
      const db2 = await openDb();
      await idbPut(db2, STORAGE_KEY, state);
      db2.close();
      localStorage.removeItem(STORAGE_KEY);
      return state;
    }
  } catch (e) { console.warn('[api-client] IndexedDB read failed, using defaults', e); }
  return getDefaultState();
}

export async function saveApiClientState(state: ApiClientPersistedState) {
  try {
    const db = await openDb();
    await idbPut(db, STORAGE_KEY, state);
    db.close();
  } catch (e) { console.warn('[api-client] failed to persist state', e); }
}

/* ---------- URL / Auth / Body builders ---------- */

function kvToRecord(list: ApiKeyValue[]): Record<string, string> {
  return list.reduce<Record<string, string>>((r, item) => { if (item.enabled && item.key.trim()) r[item.key] = item.value; return r; }, {});
}

export function buildUrl(baseUrl: string, params: ApiKeyValue[]): string {
  const enabled = params.filter((p) => p.enabled && p.key.trim());
  if (enabled.length === 0) return baseUrl;
  try {
    const url = new URL(baseUrl);
    enabled.forEach((p) => url.searchParams.set(p.key, p.value));
    return url.toString();
  } catch {
    const qs = enabled.map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${qs}`;
  }
}

export function applyAuth(request: ApiRequest, headers: Record<string, string>, url: string): { headers: Record<string, string>; url: string } {
  const { auth } = request;
  switch (auth.type) {
    case 'bearer':
      if (auth.bearerToken) headers.Authorization = `Bearer ${auth.bearerToken}`;
      break;
    case 'basic':
      if (auth.basicUsername || auth.basicPassword) headers.Authorization = `Basic ${btoa(`${auth.basicUsername ?? ''}:${auth.basicPassword ?? ''}`)}`;
      break;
    case 'api-key':
      if (auth.apiKeyName && auth.apiKeyValue) {
        if (auth.apiKeyIn === 'query') {
          try { const u = new URL(url); u.searchParams.set(auth.apiKeyName, auth.apiKeyValue); url = u.toString(); }
          catch { url = `${url}${url.includes('?') ? '&' : '?'}${encodeURIComponent(auth.apiKeyName)}=${encodeURIComponent(auth.apiKeyValue)}`; }
        } else headers[auth.apiKeyName] = auth.apiKeyValue;
      }
      break;
  }
  return { headers, url };
}

export function buildBody(request: ApiRequest, headers: Record<string, string>): { body: BodyInit | null; headers: Record<string, string> } {
  const { method, bodyType, bodyContent } = request;
  if (method === 'GET' || method === 'HEAD' || bodyType === 'none') return { body: null, headers };
  if (bodyType === 'json') { headers['Content-Type'] ??= 'application/json'; return { body: bodyContent, headers }; }
  if (bodyType === 'text') { headers['Content-Type'] ??= 'text/plain'; return { body: bodyContent, headers }; }
  if (bodyType === 'form-urlencoded') { headers['Content-Type'] ??= 'application/x-www-form-urlencoded'; return { body: bodyContent, headers }; }
  return { body: null, headers };
}

export function resolveRequestWithEnvironment(request: ApiRequest, environment: ApiEnvironment | null) {
  const resolve = (text: string) => resolveApiVariables({ text, environment, task: null });
  return {
    ...request,
    url: resolve(request.url),
    params: request.params.map((p) => ({ ...p, key: resolve(p.key), value: resolve(p.value) })),
    headers: request.headers.map((h) => ({ ...h, key: resolve(h.key), value: resolve(h.value) })),
    auth: {
      ...request.auth,
      bearerToken: request.auth.bearerToken ? resolve(request.auth.bearerToken) : request.auth.bearerToken,
      basicUsername: request.auth.basicUsername ? resolve(request.auth.basicUsername) : request.auth.basicUsername,
      basicPassword: request.auth.basicPassword ? resolve(request.auth.basicPassword) : request.auth.basicPassword,
      apiKeyName: request.auth.apiKeyName ? resolve(request.auth.apiKeyName) : request.auth.apiKeyName,
      apiKeyValue: request.auth.apiKeyValue ? resolve(request.auth.apiKeyValue) : request.auth.apiKeyValue,
    },
    bodyContent: resolve(request.bodyContent),
  };
}

/* ---------- Result parser ---------- */

export function parseFetchResponse(result: Response, startTime: number): Promise<ApiResponse> {
  return result.text().then((responseBody) => {
    const durationMs = Math.round(performance.now() - startTime);
    const responseHeaders: Record<string, string> = {};
    result.headers.forEach((value, key) => { responseHeaders[key] = value; });
    return {
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
  });
}

export function createHistoryEntry(request: ApiRequest, resolvedUrl: string, status: number, durationMs: number, environmentId?: string, errorMessage?: string) {
  return {
    id: crypto.randomUUID(),
    requestId: request.id,
    linkedTaskId: request.linkedTaskId,
    environmentId: environmentId ?? request.environmentId,
    method: request.method,
    url: request.url,
    resolvedUrl,
    status,
    durationMs,
    timestamp: Date.now(),
    ...(errorMessage ? { errorMessage } : {}),
  };
}

export function getErrorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

export function getErrorName(error: unknown): string | undefined {
  return error instanceof Error ? error.name : undefined;
}

export { MAX_HISTORY };
