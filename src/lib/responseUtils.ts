import type { BadgeVariant } from '../ui';

export function getStatusVariant(status: number): BadgeVariant {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'info';
  if (status >= 400 && status < 500) return 'warning';
  if (status >= 500) return 'danger';
  return 'default';
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин. назад`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} д. назад`;
  return new Date(timestamp).toLocaleDateString('ru-RU');
}
