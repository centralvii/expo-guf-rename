import { useState, useMemo } from 'react';
import { Send, Save, Plus, X, Ban } from 'lucide-react';
import { useApiClient } from '../hooks/useApiClient';
import { useToast } from '../hooks/useToast';
import { HTTP_METHODS, type HttpMethod } from '../types';

// --- UI-Kit Imports ---
import { Toolbar } from '../ui/Toolbar/Toolbar';
import { Island } from '../ui/Layout/Island';
import { PageTitle } from '../ui/Layout/PageTitle';
import { Button } from '../ui/Button/Button';
import { Input } from '../ui/Input/Input';
import { Select } from '../ui/Select/Select';
import type { SelectOption } from '../ui/Select/Select';

// --- Local subcomponents ---
import { KeyValueEditor } from './ApiClient/KeyValueEditor';
import { AuthPanel } from './ApiClient/AuthPanel';
import { BodyEditor } from './ApiClient/BodyEditor';
import { ResponseViewer } from './ApiClient/ResponseViewer';
import { CollectionSidebar } from './ApiClient/CollectionSidebar';

type RequestTab = 'params' | 'headers' | 'auth' | 'body';

const REQUEST_TABS: { value: RequestTab; label: string }[] = [
  { value: 'params', label: 'Параметры' },
  { value: 'headers', label: 'Headers' },
  { value: 'auth', label: 'Авторизация' },
  { value: 'body', label: 'Body' },
];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: '#22c55e',
  POST: '#f59e0b',
  PUT: '#3b82f6',
  PATCH: '#a855f7',
  DELETE: '#ef4444',
  HEAD: '#6b7280',
  OPTIONS: '#06b6d4',
};

const METHOD_OPTIONS: SelectOption<HttpMethod>[] = HTTP_METHODS.map((m) => ({
  value: m,
  label: m,
  color: METHOD_COLORS[m],
}));

export function ApiClientPage() {
  const state = useApiClient();
  const { notify } = useToast();
  const [activePanelTab, setActivePanelTab] = useState<RequestTab>('params');

  const {
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
  } = state;

  const isBodyDisabled = useMemo(
    () => activeRequest?.method === 'GET' || activeRequest?.method === 'HEAD',
    [activeRequest?.method]
  );

  const paramsCount = activeRequest?.params.filter((p) => p.enabled && p.key.trim()).length ?? 0;
  const headersCount = activeRequest?.headers.filter((h) => h.enabled && h.key.trim()).length ?? 0;

  const handleSave = () => {
    if (!activeRequest) return;
    if (!activeRequest.url.trim()) {
      notify('Укажите URL перед сохранением', 'error');
      return;
    }
    saveToCollection();
    notify('Запрос сохранён в коллекцию');
  };

  const handleSend = async () => {
    try {
      await sendRequest();
    } catch {
      // Ошибки уже обрабатываются внутри хука
    }
  };

  if (!activeRequest) {
    return (
      <div className="tool-page anim-fade-in">
        <div className="tool-page__content tool-page__content--auto" />
      </div>
    );
  }

  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content">

        <Toolbar>
          <Toolbar.Left>
            <PageTitle>Запросник</PageTitle>
          </Toolbar.Left>
          <Toolbar.Right>
            <Button
              variant="secondary"
              size="sm"
              icon={<Save size={14} />}
              onClick={handleSave}
            >
              Сохранить
            </Button>
          </Toolbar.Right>
        </Toolbar>

        <div className="api-workspace">
          {/* Левая панель — коллекция и история */}
          <CollectionSidebar
            collection={collection}
            history={history}
            onLoadRequest={loadFromCollection}
            onRemoveRequest={removeFromCollection}
            onLoadHistory={loadFromHistory}
            onClearHistory={clearHistory}
          />

          {/* Основная рабочая область */}
          <div className="api-main">
            {/* Вкладки запросов */}
            <div className="api-tabs">
              <div className="api-tabs__list">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`api-tab ${tab.id === activeRequestId ? 'api-tab--active' : ''}`}
                  >
                    <button
                      type="button"
                      className="api-tab__main"
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span className={`api-method-tag api-method-tag--${tab.method.toLowerCase()}`}>
                        {tab.method}
                      </span>
                      <span className="api-tab__name">{tab.name}</span>
                    </button>
                    <button
                      type="button"
                      className="api-tab__close"
                      onClick={() => closeTab(tab.id)}
                      title="Закрыть"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={14} />}
                onClick={createNewTab}
                title="Новый запрос"
              />
            </div>

            {/* URL bar */}
            <Island flex={false} className="api-url-bar">
              <Select
                value={activeRequest.method}
                onChange={(method) => updateActiveRequest({ method })}
                options={METHOD_OPTIONS}
                size="sm"
                className="api-url-bar__method"
              />

              <div className="api-url-bar__input">
                <Input
                  value={activeRequest.url}
                  onChange={(e) => updateActiveRequest({ url: e.target.value })}
                  placeholder="https://api.example.com/endpoint"
                  fullWidth
                  noContainer
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                />
              </div>

              {isLoading ? (
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Ban size={14} />}
                  onClick={cancelRequest}
                >
                  Отмена
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Send size={14} />}
                  onClick={handleSend}
                  disabled={!activeRequest.url.trim()}
                >
                  Отправить
                </Button>
              )}
            </Island>

            {/* Request panel */}
            <Island flex={false} className="api-request-panel">
              <div className="api-panel-tabs">
                {REQUEST_TABS.map((t) => {
                  const count =
                    t.value === 'params' ? paramsCount :
                    t.value === 'headers' ? headersCount :
                    0;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      className={`api-panel-tab ${activePanelTab === t.value ? 'api-panel-tab--active' : ''}`}
                      onClick={() => setActivePanelTab(t.value)}
                    >
                      {t.label}
                      {count > 0 && <span className="api-panel-tab__count">{count}</span>}
                      {t.value === 'auth' && activeRequest.auth.type !== 'none' && (
                        <span className="api-panel-tab__dot" />
                      )}
                      {t.value === 'body' && activeRequest.bodyType !== 'none' && !isBodyDisabled && (
                        <span className="api-panel-tab__dot" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="api-panel-content">
                {activePanelTab === 'params' && (
                  <KeyValueEditor
                    items={activeRequest.params}
                    onChange={(params) => updateActiveRequest({ params })}
                    keyPlaceholder="Параметр"
                    valuePlaceholder="Значение"
                    emptyMessage="Нет query-параметров"
                  />
                )}
                {activePanelTab === 'headers' && (
                  <KeyValueEditor
                    items={activeRequest.headers}
                    onChange={(headers) => updateActiveRequest({ headers })}
                    keyPlaceholder="Header"
                    valuePlaceholder="Значение"
                    emptyMessage="Нет заголовков"
                  />
                )}
                {activePanelTab === 'auth' && (
                  <AuthPanel
                    auth={activeRequest.auth}
                    onChange={(auth) => updateActiveRequest({ auth })}
                  />
                )}
                {activePanelTab === 'body' && (
                  <BodyEditor
                    bodyType={activeRequest.bodyType}
                    bodyContent={activeRequest.bodyContent}
                    disabled={isBodyDisabled}
                    onTypeChange={(bodyType) => updateActiveRequest({ bodyType })}
                    onContentChange={(bodyContent) => updateActiveRequest({ bodyContent })}
                  />
                )}
              </div>
            </Island>

            {/* Response */}
            <Island flex={false} className="api-response-panel">
              <ResponseViewer
                response={response}
                isLoading={isLoading}
                error={error}
              />
            </Island>
          </div>
        </div>
      </div>
    </div>
  );
}
