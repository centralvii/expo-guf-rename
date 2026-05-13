import { memo, useState } from 'react';
import { Bookmark, History, Trash2, FolderOpen } from 'lucide-react';
import type { ApiRequest, ApiHistoryEntry } from '../../types';
import { Badge, Button, EmptyState, IconButton, type BadgeVariant } from '../../ui';

type SidebarTab = 'collection' | 'history';

interface CollectionSidebarProps {
  collection: ApiRequest[];
  history: ApiHistoryEntry[];
  onLoadRequest: (id: string) => void;
  onRemoveRequest: (id: string) => void;
  onLoadHistory: (id: string) => void;
  onClearHistory: () => void;
}

function getStatusVariant(status: number): BadgeVariant {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'info';
  if (status >= 400 && status < 500) return 'warning';
  if (status >= 500) return 'danger';
  return 'default';
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'сейчас';
  if (min < 60) return `${min}м`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}ч`;
  return `${Math.floor(h / 24)}д`;
}

function CollectionList({
  collection,
  onLoadRequest,
  onRemoveRequest,
}: {
  collection: ApiRequest[];
  onLoadRequest: (id: string) => void;
  onRemoveRequest: (id: string) => void;
}) {
  if (collection.length === 0) {
    return (
      <EmptyState
        className="api-sidebar__empty"
        icon={<FolderOpen size={28} />}
        title="Коллекция пуста"
        description="Сохраните запрос, чтобы он появился здесь"
      />
    );
  }

  return (
    <>
      {collection.map((req) => (
        <div key={req.id} className="api-sidebar__item">
          <button
            type="button"
            className="api-sidebar__item-main"
            onClick={() => onLoadRequest(req.id)}
          >
            <span className={`api-method-tag api-method-tag--${req.method.toLowerCase()}`}>
              {req.method}
            </span>
            <div className="api-sidebar__item-info">
              <span className="api-sidebar__item-name">{req.name}</span>
              <span className="api-sidebar__item-url">{req.url || 'без URL'}</span>
            </div>
          </button>
          <IconButton
            variant="ghost"
            size="sm"
            icon={<Trash2 size={13} />}
            label="Удалить"
            onClick={() => onRemoveRequest(req.id)}
            className="api-sidebar__item-action"
          />
        </div>
      ))}
    </>
  );
}

function HistoryList({
  history,
  onLoadHistory,
  onClearHistory,
}: {
  history: ApiHistoryEntry[];
  onLoadHistory: (id: string) => void;
  onClearHistory: () => void;
}) {
  if (history.length === 0) {
    return (
      <EmptyState
        className="api-sidebar__empty"
        icon={<History size={28} />}
        title="Нет истории"
        description="Здесь появятся выполненные запросы"
      />
    );
  }

  return (
    <>
      <div className="api-sidebar__history-header">
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 size={12} />}
          onClick={onClearHistory}
        >
          Очистить
        </Button>
      </div>
      {history.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className="api-sidebar__history-item"
          onClick={() => onLoadHistory(entry.id)}
        >
          <div className="api-sidebar__history-row">
            <span className={`api-method-tag api-method-tag--${entry.method.toLowerCase()}`}>
              {entry.method}
            </span>
            <Badge variant={getStatusVariant(entry.status)}>{entry.status}</Badge>
            <span className="api-sidebar__history-time">
              {formatRelativeTime(entry.timestamp)}
            </span>
          </div>
          <span className="api-sidebar__history-url">{entry.url}</span>
        </button>
      ))}
    </>
  );
}

export const CollectionSidebar = memo(function CollectionSidebar({
  collection,
  history,
  onLoadRequest,
  onRemoveRequest,
  onLoadHistory,
  onClearHistory,
}: CollectionSidebarProps) {
  const [tab, setTab] = useState<SidebarTab>('collection');

  return (
    <aside className="api-sidebar">
      <div className="api-sidebar__tabs">
        <button
          type="button"
          className={`api-sidebar__tab ${tab === 'collection' ? 'api-sidebar__tab--active' : ''}`}
          onClick={() => setTab('collection')}
        >
          <Bookmark size={14} />
          Коллекция
          <span className="api-sidebar__count">{collection.length}</span>
        </button>
        <button
          type="button"
          className={`api-sidebar__tab ${tab === 'history' ? 'api-sidebar__tab--active' : ''}`}
          onClick={() => setTab('history')}
        >
          <History size={14} />
          История
          <span className="api-sidebar__count">{history.length}</span>
        </button>
      </div>

      <div className="api-sidebar__list custom-scrollbar">
        {tab === 'collection' ? (
          <CollectionList
            collection={collection}
            onLoadRequest={onLoadRequest}
            onRemoveRequest={onRemoveRequest}
          />
        ) : (
          <HistoryList
            history={history}
            onLoadHistory={onLoadHistory}
            onClearHistory={onClearHistory}
          />
        )}
      </div>
    </aside>
  );
});
