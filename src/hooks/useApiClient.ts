import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ApiCollection, ApiEnvironment, ApiHistoryEntry, ApiRequest, ApiResponse } from '../types';
import { findUnresolvedVariables, resolveApiVariables } from '../lib/apiVariables';
import {
  buildBody,
  buildUrl,
  applyAuth,
  parseFetchResponse,
  createEmptyRequest,
  createHistoryEntry,
  getErrorName,
  getErrorMessage,
  loadApiClientState,
  resolveRequestWithEnvironment,
  saveApiClientState,
} from '../lib/apiClient';

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
  isLoaded: boolean;
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
}

export function useApiClient(): UseApiClientReturn {
  const [tabs, setTabs] = useState<ApiRequest[]>([]);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [collection, setCollection] = useState<ApiRequest[]>([]);
  const [collections, setCollections] = useState<ApiCollection[]>([]);
  const [history, setHistory] = useState<ApiHistoryEntry[]>([]);
  const [environments, setEnvironments] = useState<ApiEnvironment[]>([]);
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Async init from IndexedDB
  useEffect(() => {
    loadApiClientState().then((saved) => {
      const initialTab = createEmptyRequest();
      setTabs([initialTab]);
      setActiveRequestId(initialTab.id);
      setCollection(saved.collection);
      setCollections(saved.collections);
      setHistory(saved.history);
      setEnvironments(saved.environments);
      setActiveEnvironmentId(saved.activeEnvironmentId);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    saveApiClientState({ collection, collections, history, environments, activeRequestId, activeEnvironmentId });
  }, [collection, collections, history, environments, activeRequestId, activeEnvironmentId, isLoaded]);

  const activeRequest = tabs.find((tab) => tab.id === activeRequestId) ?? null;
  const activeEnvironment = environments.find((env) => env.id === activeEnvironmentId) ?? null;

  const unresolvedVariables = useMemo(() => {
    if (!activeRequest) return [];
    const fields = [
      activeRequest.url, activeRequest.bodyContent,
      ...activeRequest.params.flatMap((p) => [p.key, p.value]),
      ...activeRequest.headers.flatMap((h) => [h.key, h.value]),
      activeRequest.auth.bearerToken ?? '', activeRequest.auth.basicUsername ?? '',
      activeRequest.auth.basicPassword ?? '', activeRequest.auth.apiKeyName ?? '', activeRequest.auth.apiKeyValue ?? '',
    ];
    const resolvedFields = fields.map((f) => resolveApiVariables({ text: f, environment: activeEnvironment, task: null }));
    return Array.from(new Set(resolvedFields.flatMap((f) => findUnresolvedVariables(f))));
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
      if (next.length === 0) { const fresh = createEmptyRequest(); setActiveRequestId(fresh.id); return [fresh]; }
      if (id === activeRequestId) { const idx = prev.findIndex((tab) => tab.id === id); setActiveRequestId(next[Math.min(idx, next.length - 1)].id); }
      return next;
    });
    setResponse(null);
  }, [activeRequestId]);

  const setActiveTab = useCallback((id: string) => { setActiveRequestId(id); setResponse(null); setError(null); }, []);
  const updateActiveRequest = useCallback((updates: Partial<ApiRequest>) => {
    setTabs((prev) => prev.map((tab) => tab.id === activeRequestId ? { ...tab, ...updates, updatedAt: Date.now() } : tab));
  }, [activeRequestId]);

  const saveToCollection = useCallback(() => {
    if (!activeRequest) return;
    setCollection((prev) => {
      const i = prev.findIndex((r) => r.id === activeRequest.id);
      if (i >= 0) { const n = [...prev]; n[i] = { ...activeRequest, updatedAt: Date.now() }; return n; }
      return [{ ...activeRequest, updatedAt: Date.now() }, ...prev];
    });
  }, [activeRequest]);

  const loadFromCollection = useCallback((id: string) => {
    const request = collection.find((item) => item.id === id);
    if (!request) return;
    if (tabs.find((tab) => tab.id === id)) { setActiveRequestId(id); }
    else { setTabs((prev) => [...prev, { ...request }]); setActiveRequestId(id); }
    if (request.environmentId) setActiveEnvironmentId(request.environmentId);
    setResponse(null); setError(null);
  }, [collection, tabs]);

  const removeFromCollection = useCallback((id: string) => setCollection((prev) => prev.filter((r) => r.id !== id)), []);
  const clearHistory = useCallback(() => setHistory([]), []);

  const loadFromHistory = useCallback((id: string) => {
    const entry = history.find((item) => item.id === id);
    if (!entry) return;
    const newTab: ApiRequest = { ...createEmptyRequest(), name: `${entry.method} ${entry.url}`, method: entry.method, url: entry.url, linkedTaskId: entry.linkedTaskId, environmentId: entry.environmentId ?? activeEnvironmentId ?? 'local' };
    setTabs((prev) => [...prev, newTab]);
    setActiveRequestId(newTab.id);
    if (newTab.environmentId) setActiveEnvironmentId(newTab.environmentId);
    setResponse(null);
  }, [activeEnvironmentId, history]);

  const setActiveEnvironment = useCallback((id: string) => {
    setActiveEnvironmentId(id);
    setEnvironments((prev) => prev.map((e) => ({ ...e, isActive: e.id === id })));
    updateActiveRequest({ environmentId: id });
  }, [updateActiveRequest]);

  const sendRequest = useCallback(async () => {
    if (!activeRequest) return;
    if (!activeRequest.url.trim()) { setError('URL не указан'); return; }
    setIsLoading(true); setError(null); setResponse(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const startTime = performance.now();
    const resolvedRequest = resolveRequestWithEnvironment({ ...activeRequest, environmentId: activeRequest.environmentId ?? activeEnvironment?.id }, activeEnvironment);
    try {
      let url = buildUrl(resolvedRequest.url, resolvedRequest.params);
      let headers: Record<string, string> = {};
      resolvedRequest.headers.forEach((h) => { if (h.enabled && h.key.trim()) headers[h.key] = h.value; });
      const authed = applyAuth(resolvedRequest, headers, url);
      const built = buildBody(resolvedRequest, authed.headers);
      const result = await fetch(url, { method: resolvedRequest.method, headers: authed.headers, body: built.body, signal: controller.signal });
      const apiResponse = await parseFetchResponse(result, startTime);
      setResponse(apiResponse);
      const entry = createHistoryEntry(activeRequest, url, result.status, apiResponse.durationMs, activeEnvironment?.id);
      setHistory((prev) => [entry, ...prev].slice(0, 50));
    } catch (error) {
      const msg = getErrorMessage(error);
      let nextError = msg ?? 'Unknown error';
      if (getErrorName(error) === 'AbortError') nextError = 'Запрос отменён';
      else if (msg?.includes('Failed to fetch')) nextError = 'Ошибка сети или CORS. Проверьте URL и доступность сервера.';
      setError(nextError);
      const dur = Math.round(performance.now() - startTime);
      const entry = createHistoryEntry(activeRequest, resolvedRequest.url, 0, dur, activeEnvironment?.id, nextError);
      setHistory((prev) => [entry, ...prev].slice(0, 50));
    } finally { setIsLoading(false); abortRef.current = null; }
  }, [activeEnvironment, activeRequest]);

  const cancelRequest = useCallback(() => abortRef.current?.abort(), []);

  return {
    tabs, activeRequestId, activeRequest, collection, collections, history, environments, activeEnvironment,
    unresolvedVariables, isLoaded, response, isLoading, error,
    createNewTab, closeTab, setActiveTab, updateActiveRequest, saveToCollection, loadFromCollection, removeFromCollection,
    sendRequest, cancelRequest, clearHistory, loadFromHistory, setActiveEnvironment,
  };
}

export { createEmptyRequest };
