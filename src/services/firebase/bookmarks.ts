import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, Timestamp } from 'firebase/firestore';
import { createBookmarkItem, normalizeBookmark, updateBookmarkItem, type BookmarkDraft } from '../../lib/bookmarks';
import { getFirestoreDb, isFirebaseConfigured } from './client';
import type { BookmarkItem } from '../../types';

const BOOKMARKS_COLLECTION = 'bookmarks';

function toFirestoreBookmark(bookmark: BookmarkItem) {
  return {
    id: bookmark.id,
    title: bookmark.title,
    url: bookmark.url,
    ...(bookmark.description ? { description: bookmark.description } : {}),
    ...(bookmark.category ? { category: bookmark.category } : {}),
    ...(bookmark.iconUrl ? { iconUrl: bookmark.iconUrl } : {}),
    pinned: Boolean(bookmark.pinned),
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  };
}

function mapBookmarkDoc(id: string, data: Record<string, unknown>): BookmarkItem {
  const createdAt = data.createdAt instanceof Timestamp
    ? data.createdAt.toMillis()
    : (data.createdAt as number) || Date.now();

  const updatedAt = data.updatedAt instanceof Timestamp
    ? data.updatedAt.toMillis()
    : (data.updatedAt as number) || createdAt;

  return normalizeBookmark({
    id,
    title: (data.title as string) || '',
    url: (data.url as string) || '',
    description: typeof data.description === 'string' ? data.description : undefined,
    category: typeof data.category === 'string' ? data.category : undefined,
    iconUrl: typeof data.iconUrl === 'string' ? data.iconUrl : undefined,
    pinned: Boolean(data.pinned),
    createdAt,
    updatedAt,
  });
}

function ensureFirebaseBookmarksAvailable() {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase не настроен. Проверьте настройки подключения.');
  }
}

export async function listFirebaseBookmarks(): Promise<BookmarkItem[]> {
  ensureFirebaseBookmarksAvailable();
  const db = getFirestoreDb();
  const bookmarksRef = collection(db, BOOKMARKS_COLLECTION);
  const bookmarksQuery = query(bookmarksRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(bookmarksQuery);
  return snapshot.docs.map((bookmarkDoc) => mapBookmarkDoc(bookmarkDoc.id, bookmarkDoc.data()));
}

export async function createFirebaseBookmark(draft: BookmarkDraft): Promise<BookmarkItem> {
  ensureFirebaseBookmarksAvailable();
  const db = getFirestoreDb();
  const bookmark = createBookmarkItem(draft);
  await setDoc(doc(db, BOOKMARKS_COLLECTION, bookmark.id), toFirestoreBookmark(bookmark));
  return bookmark;
}

export async function updateFirebaseBookmark(bookmark: BookmarkItem, draft: BookmarkDraft): Promise<BookmarkItem> {
  ensureFirebaseBookmarksAvailable();
  const db = getFirestoreDb();
  const nextBookmark = updateBookmarkItem(bookmark, draft);
  await setDoc(doc(db, BOOKMARKS_COLLECTION, bookmark.id), toFirestoreBookmark(nextBookmark));
  return nextBookmark;
}

export async function deleteFirebaseBookmark(id: string): Promise<void> {
  ensureFirebaseBookmarksAvailable();
  const db = getFirestoreDb();
  await deleteDoc(doc(db, BOOKMARKS_COLLECTION, id));
}
