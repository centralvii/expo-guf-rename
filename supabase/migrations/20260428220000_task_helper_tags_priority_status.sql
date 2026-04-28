-- Add priority, status, and tags columns to task_helper_tasks
alter table public.task_helper_tasks
  add column if not exists priority text not null default 'medium',
  add column if not exists status text not null default 'open',
  add column if not exists tags jsonb not null default '[]'::jsonb;

-- Index for status filtering
create index if not exists task_helper_tasks_status_idx
  on public.task_helper_tasks (status);

-- Index for priority filtering
create index if not exists task_helper_tasks_priority_idx
  on public.task_helper_tasks (priority);
