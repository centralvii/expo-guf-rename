import type { BookmarkItem } from '../types';

export const BOOKMARKS_STORAGE_KEY = 'gd-helper-bookmarks';

export interface BookmarkDraft {
  title: string;
  url: string;
  description?: string;
  category?: string;
  pinned?: boolean;
}

export function sanitizeBookmarkText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeBookmarkUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function getBookmarkFaviconUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return '';
  }
}

export function normalizeBookmark(bookmark: BookmarkItem): BookmarkItem {
  const normalizedUrl = normalizeBookmarkUrl(bookmark.url);
  return {
    ...bookmark,
    title: bookmark.title.trim(),
    url: normalizedUrl,
    description: sanitizeBookmarkText(bookmark.description),
    category: sanitizeBookmarkText(bookmark.category),
    iconUrl: bookmark.iconUrl || getBookmarkFaviconUrl(normalizedUrl),
    pinned: Boolean(bookmark.pinned),
  };
}

export function createBookmarkItem(draft: BookmarkDraft): BookmarkItem {
  const now = Date.now();
  const normalizedUrl = normalizeBookmarkUrl(draft.url);
  return normalizeBookmark({
    id: crypto.randomUUID(),
    title: draft.title.trim(),
    url: normalizedUrl,
    description: sanitizeBookmarkText(draft.description),
    category: sanitizeBookmarkText(draft.category),
    iconUrl: getBookmarkFaviconUrl(normalizedUrl),
    pinned: Boolean(draft.pinned),
    createdAt: now,
    updatedAt: now,
  });
}

export function updateBookmarkItem(bookmark: BookmarkItem, draft: BookmarkDraft): BookmarkItem {
  const normalizedUrl = normalizeBookmarkUrl(draft.url);
  return normalizeBookmark({
    ...bookmark,
    title: draft.title.trim(),
    url: normalizedUrl,
    description: sanitizeBookmarkText(draft.description),
    category: sanitizeBookmarkText(draft.category),
    iconUrl: getBookmarkFaviconUrl(normalizedUrl),
    pinned: Boolean(draft.pinned),
    updatedAt: Date.now(),
  });
}

export function loadBookmarks(): BookmarkItem[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as BookmarkItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((bookmark) => bookmark && typeof bookmark.title === 'string' && typeof bookmark.url === 'string')
      .map(normalizeBookmark);
  } catch {
    return [];
  }
}

export function saveBookmarks(bookmarks: BookmarkItem[]): void {
  localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks.map(normalizeBookmark)));
}

export function createBookmark(bookmarks: BookmarkItem[], draft: BookmarkDraft): BookmarkItem[] {
  const bookmark = createBookmarkItem(draft);

  const next = [bookmark, ...bookmarks];
  saveBookmarks(next);
  return next;
}

export function updateBookmark(bookmarks: BookmarkItem[], id: string, draft: BookmarkDraft): BookmarkItem[] {
  const next = bookmarks.map((bookmark) => {
    if (bookmark.id !== id) {
      return bookmark;
    }

    return updateBookmarkItem(bookmark, draft);
  });

  saveBookmarks(next);
  return next;
}

export function deleteBookmark(bookmarks: BookmarkItem[], id: string): BookmarkItem[] {
  const next = bookmarks.filter((bookmark) => bookmark.id !== id);
  saveBookmarks(next);
  return next;
}
