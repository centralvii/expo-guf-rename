import { Flame, ArrowUp, ArrowRight, ArrowDown, Circle, Clock, GitPullRequest, CheckCircle2, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BadgeVariant } from '../ui';
import type { TaskPriority, TaskStatus } from '../types';

export const PRIORITY_ICONS: Record<TaskPriority, ReactNode> = {
  critical: <Flame size={12} />,
  high: <ArrowUp size={12} />,
  medium: <ArrowRight size={12} />,
  low: <ArrowDown size={12} />,
};

export const PRIORITY_BADGE_VARIANTS: Record<TaskPriority, BadgeVariant> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

export const STATUS_ICONS: Record<TaskStatus, ReactNode> = {
  open: <Circle size={12} />,
  in_progress: <Clock size={12} />,
  review: <GitPullRequest size={12} />,
  done: <CheckCircle2 size={12} />,
  closed: <XCircle size={12} />,
};

export const STATUS_BADGE_VARIANTS: Record<TaskStatus, BadgeVariant> = {
  open: 'default',
  in_progress: 'accent',
  review: 'warning',
  done: 'success',
  closed: 'default',
};
