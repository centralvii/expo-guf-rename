import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, EmptyState, IconButton, InlineError, Input, Modal, Textarea } from '../ui';
import { Bookmark, BookmarkPlus, Copy, ExternalLink, Globe, Pencil, Pin, Search, Trash2, X } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { createBookmark, deleteBookmark, getBookmarkFaviconUrl, loadBookmarks, normalizeBookmarkUrl, updateBookmark, type BookmarkDraft } from '../lib/bookmarks';
import { createFirebaseBookmark, deleteFirebaseBookmark, listFirebaseBookmarks, updateFirebaseBookmark } from '../services/firebase/bookmarks';
import { useSettings } from '../hooks/useSettings';
import type { BookmarkItem } from '../types';
import '../Bookmarks.css';

interface BookmarkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  docked?: boolean;
}

const EMPTY_DRAFT: BookmarkDraft = {
  title: '',
  url: '',
  description: '',
  category: '',
  pinned: false,
};

function sortBookmarks(bookmarks: BookmarkItem[]): BookmarkItem[] {
  return [...bookmarks].sort((left, right) => {
    if (Boolean(left.pinned) !== Boolean(right.pinned)) {
      return left.pinned ? -1 : 1;
    }

    return (right.updatedAt || right.createdAt) - (left.updatedAt || left.createdAt);
  });
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizeBookmarkUrl(url));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function BookmarkDrawer({ isOpen, onClose, docked = false }: BookmarkDrawerProps) {
  const { settings } = useSettings();
  const { notify } = useToast();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isExpanded, setIsExpanded] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => loadBookmarks());
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BookmarkDraft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);
  const [failedIconIds, setFailedIconIds] = useState<Record<string, true>>({});

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsExpanded(false);
      const frameId = window.requestAnimationFrame(() => {
        setIsExpanded(true);
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    if (!shouldRender) {
      return;
    }

    setIsExpanded(false);
    const timer = window.setTimeout(() => {
      setShouldRender(false);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [isOpen, shouldRender]);

  const usesFirebase = settings.connectionMethod === 'firebase';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;
    setLoadError(null);
    setIsLoading(true);

    const load = async () => {
      try {
        const nextBookmarks = usesFirebase ? await listFirebaseBookmarks() : loadBookmarks();
        if (!cancelled) {
          setBookmarks(nextBookmarks);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить закладки.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, usesFirebase]);

  const filteredBookmarks = useMemo(() => {
    const sorted = sortBookmarks(bookmarks);
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sorted;
    }

    return sorted.filter((bookmark) => {
      const haystack = [bookmark.title, bookmark.url, bookmark.description, bookmark.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [bookmarks, searchQuery]);

  const openCreateModal = () => {
    setEditingBookmarkId(null);
    setDraft(EMPTY_DRAFT);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (bookmark: BookmarkItem) => {
    setEditingBookmarkId(bookmark.id);
    setDraft({
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description || '',
      category: bookmark.category || '',
      pinned: Boolean(bookmark.pinned),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  const saveBookmarkDraft = async () => {
    const title = draft.title.trim();
    const url = draft.url.trim();

    if (!title) {
      setFormError('Укажите название закладки.');
      return;
    }

    if (!url) {
      setFormError('Укажите ссылку.');
      return;
    }

    if (!isValidUrl(url)) {
      setFormError('Введите корректный URL.');
      return;
    }

    const nextDraft = {
      ...draft,
      title,
      url: normalizeBookmarkUrl(url),
    };

    try {
      const editingBookmark = editingBookmarkId
        ? bookmarks.find((bookmark) => bookmark.id === editingBookmarkId) ?? null
        : null;

      if (editingBookmarkId && usesFirebase && !editingBookmark) {
        throw new Error('Не удалось найти закладку для обновления.');
      }

      const next = editingBookmarkId
        ? (usesFirebase
          ? await updateFirebaseBookmark(editingBookmark as BookmarkItem, nextDraft).then((updatedBookmark) => bookmarks.map((bookmark) => bookmark.id === updatedBookmark.id ? updatedBookmark : bookmark))
          : updateBookmark(bookmarks, editingBookmarkId, nextDraft))
        : (usesFirebase
          ? await createFirebaseBookmark(nextDraft).then((createdBookmark) => [createdBookmark, ...bookmarks])
          : createBookmark(bookmarks, nextDraft));

      setBookmarks(next);
      setFormError(null);
      setDraft(EMPTY_DRAFT);
      setEditingBookmarkId(null);
      notify(editingBookmarkId ? 'Закладка обновлена' : 'Закладка добавлена', 'success');
      setIsModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось сохранить закладку.');
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    try {
      if (usesFirebase) {
        await deleteFirebaseBookmark(id);
        setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== id));
      } else {
        setBookmarks(deleteBookmark(bookmarks, id));
      }
      notify('Закладка удалена', 'error');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось удалить закладку.', 'error');
    }
  };

  const handleTogglePinned = async (bookmark: BookmarkItem) => {
    const draft = {
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description,
      category: bookmark.category,
      pinned: !bookmark.pinned,
    };

    try {
      if (usesFirebase) {
        const updatedBookmark = await updateFirebaseBookmark(bookmark, draft);
        setBookmarks((prev) => prev.map((item) => item.id === updatedBookmark.id ? updatedBookmark : item));
      } else {
        setBookmarks(updateBookmark(bookmarks, bookmark.id, draft));
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Не удалось обновить закладку.', 'error');
    }
  };

  const handleCopyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    notify('Ссылка скопирована', 'success');
  };

  const title = editingBookmarkId ? 'Редактировать закладку' : 'Добавить закладку';

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      <aside className={`bookmarks-panel ${docked ? 'bookmarks-panel--docked' : ''} ${isExpanded ? 'bookmarks-panel--expanded' : ''}`} aria-label="Закладки">
          <div className="bookmarks-panel__header">
            <h2 className="bookmarks-panel__title">Закладки</h2>
            <IconButton variant="ghost" size="sm" icon={<X size={16} />} label="Закрыть закладки" onClick={onClose} />
          </div>

          <div className="bookmarks-panel__body custom-scrollbar">
            <div className="bookmarks-drawer">
              <div className="bookmarks-drawer__toolbar">
                <div className="bookmarks-drawer__search">
                  <Search size={14} className="bookmarks-drawer__search-icon" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Поиск по названию, URL, описанию..."
                    noContainer
                    fullWidth
                    sizeVariant="sm"
                  />
                </div>
                <Button variant="primary" size="sm" icon={<BookmarkPlus size={14} />} onClick={openCreateModal}>Добавить</Button>
              </div>

              {isLoading ? (
                <div className="bookmarks-drawer__empty">Загрузка закладок...</div>
              ) : loadError ? (
                <InlineError title="Не удалось загрузить закладки" message={loadError} />
              ) : filteredBookmarks.length === 0 ? (
                <EmptyState
                  icon={<Bookmark size={22} />}
                  title={bookmarks.length === 0 ? 'Закладок пока нет' : 'Ничего не найдено'}
                  description={bookmarks.length === 0 ? 'Сохраните внешние ссылки, чтобы быстро возвращаться к ним позже.' : 'Попробуйте изменить запрос поиска или добавить новую закладку.'}
                  action={bookmarks.length === 0 ? <Button size="sm" onClick={openCreateModal}>Добавить первую</Button> : undefined}
                  className="bookmarks-drawer__empty"
                />
              ) : (
                <div className="bookmarks-list">
                  {filteredBookmarks.map((bookmark) => {
                    const showFallbackIcon = failedIconIds[bookmark.id] || !bookmark.iconUrl;
                    return (
                      <div key={bookmark.id} className={`bookmark-card ${bookmark.pinned ? 'bookmark-card--pinned' : ''}`}>
                        <div className="bookmark-card__main">
                          <div className="bookmark-card__favicon">
                            {showFallbackIcon ? (
                              <Globe size={16} />
                            ) : (
                              <img
                                src={bookmark.iconUrl || getBookmarkFaviconUrl(bookmark.url)}
                                alt=""
                                onError={() => setFailedIconIds((prev) => ({ ...prev, [bookmark.id]: true }))}
                              />
                            )}
                          </div>
                          <div className="bookmark-card__content">
                            <div className="bookmark-card__head">
                              <strong className="bookmark-card__title">{bookmark.title}</strong>
                              {bookmark.category && <Badge variant="default">{bookmark.category}</Badge>}
                            </div>
                            <div className="bookmark-card__url">{getHostname(bookmark.url)}</div>
                            {bookmark.description && <div className="bookmark-card__description">{bookmark.description}</div>}
                          </div>
                        </div>

                        <div className="bookmark-card__actions">
                          <IconButton variant={bookmark.pinned ? 'primary' : 'ghost'} size="sm" icon={<Pin size={14} />} label={bookmark.pinned ? 'Открепить' : 'Закрепить'} onClick={() => void handleTogglePinned(bookmark)} />
                          <IconButton variant="ghost" size="sm" icon={<ExternalLink size={14} />} label="Открыть в новой вкладке" onClick={() => window.open(bookmark.url, '_blank', 'noopener,noreferrer')} />
                          <IconButton variant="ghost" size="sm" icon={<Copy size={14} />} label="Скопировать URL" onClick={() => void handleCopyUrl(bookmark.url)} />
                          <IconButton variant="ghost" size="sm" icon={<Pencil size={14} />} label="Редактировать" onClick={() => openEditModal(bookmark)} />
                          <IconButton variant="ghost" size="sm" icon={<Trash2 size={14} />} label="Удалить" onClick={() => void handleDeleteBookmark(bookmark.id)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={title}
        footer={(
          <>
            <Button size="sm" onClick={closeModal}>Отмена</Button>
            <Button size="sm" variant="primary" onClick={() => void saveBookmarkDraft()}>Сохранить</Button>
          </>
        )}
      >
        <div className="bookmark-form">
          <Input label="Название" value={draft.title} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} fullWidth sizeVariant="sm" />
          <Input label="URL" value={draft.url} onChange={(event) => setDraft((prev) => ({ ...prev, url: event.target.value }))} placeholder="https://example.com" fullWidth sizeVariant="sm" />
          <Input label="Категория" value={draft.category || ''} onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))} fullWidth sizeVariant="sm" />
          <Textarea label="Описание" value={draft.description || ''} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} rows={3} fullWidth autoResize className="bookmark-form__textarea" />
          <label className="bookmark-form__pin">
            <input type="checkbox" checked={Boolean(draft.pinned)} onChange={(event) => setDraft((prev) => ({ ...prev, pinned: event.target.checked }))} />
            <span>Закрепить закладку</span>
          </label>
          {formError && <InlineError title="Не удалось сохранить" message={formError} />}
        </div>
      </Modal>
    </>
  );
}
