create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.task_helper_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists task_helper_tasks_updated_at_idx
  on public.task_helper_tasks (updated_at desc);

drop trigger if exists set_task_helper_tasks_updated_at on public.task_helper_tasks;

create trigger set_task_helper_tasks_updated_at
before update on public.task_helper_tasks
for each row
execute function public.set_updated_at();

alter table public.task_helper_tasks enable row level security;

create policy "task_helper_tasks_select_public"
on public.task_helper_tasks
for select
to anon, authenticated
using (true);

create policy "task_helper_tasks_insert_public"
on public.task_helper_tasks
for insert
to anon, authenticated
with check (true);

create policy "task_helper_tasks_update_public"
on public.task_helper_tasks
for update
to anon, authenticated
using (true)
with check (true);

create policy "task_helper_tasks_delete_public"
on public.task_helper_tasks
for delete
to anon, authenticated
using (true);
