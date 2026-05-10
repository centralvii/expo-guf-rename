-- Create tables for PDF Viewer tool
create table if not exists public.pdf_documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pdf_annotations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.pdf_documents(id) on delete cascade,
  content text not null,
  page_number integer not null,
  bounding_box jsonb not null,
  text_excerpt text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Indexes
create index if not exists pdf_documents_updated_at_idx on public.pdf_documents (updated_at desc);
create index if not exists pdf_annotations_document_id_idx on public.pdf_annotations (document_id);

-- Trigger for updated_at
drop trigger if exists set_pdf_documents_updated_at on public.pdf_documents;
create trigger set_pdf_documents_updated_at
before update on public.pdf_documents
for each row
execute function public.set_updated_at();

-- RLS for pdf_documents
alter table public.pdf_documents enable row level security;

create policy "pdf_documents_select_public" on public.pdf_documents for select to anon, authenticated using (true);
create policy "pdf_documents_insert_public" on public.pdf_documents for insert to anon, authenticated with check (true);
create policy "pdf_documents_update_public" on public.pdf_documents for update to anon, authenticated using (true) with check (true);
create policy "pdf_documents_delete_public" on public.pdf_documents for delete to anon, authenticated using (true);

-- RLS for pdf_annotations
alter table public.pdf_annotations enable row level security;

create policy "pdf_annotations_select_public" on public.pdf_annotations for select to anon, authenticated using (true);
create policy "pdf_annotations_insert_public" on public.pdf_annotations for insert to anon, authenticated with check (true);
create policy "pdf_annotations_update_public" on public.pdf_annotations for update to anon, authenticated using (true) with check (true);
create policy "pdf_annotations_delete_public" on public.pdf_annotations for delete to anon, authenticated using (true);

-- Storage bucket setup (if bucket doesn't exist)
insert into storage.buckets (id, name, public)
values ('pdf_documents', 'pdf_documents', true)
on conflict (id) do nothing;

-- Storage RLS policies for the bucket
create policy "Allow public upload"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'pdf_documents');

create policy "Allow public select"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'pdf_documents');

create policy "Allow public update"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'pdf_documents');

create policy "Allow public delete"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'pdf_documents');
