import type { BookmarkItem } from '../../types';
import type { BookmarkDraft } from '../../lib/bookmarks';

export function listFirebaseBookmarks(): Promise<BookmarkItem[]>;
export function createFirebaseBookmark(draft: BookmarkDraft): Promise<BookmarkItem>;
export function updateFirebaseBookmark(bookmark: BookmarkItem, draft: BookmarkDraft): Promise<BookmarkItem>;
export function deleteFirebaseBookmark(id: string): Promise<void>;
