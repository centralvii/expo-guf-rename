-- Create task_helper_history table
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/zxkbghssdexgquhqxiqg/sql/new)

create table if not exists public.task_helper_history (
  id text primary key,
  task_id uuid not null references public.task_helper_tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  type text not null check (type in ('created', 'updated', 'restored')),
  before jsonb null,
  after jsonb null,
  summary text null,
  metadata jsonb null
);

create index if not exists task_helper_history_task_id_created_at_idx
  on public.task_helper_history (task_id, created_at desc);
