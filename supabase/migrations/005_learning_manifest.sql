-- Maestría Lab · Bloque 5
-- Motor pedagógico, Learning Manifest y Modo Aprende.
-- Ejecuta este archivo después de 004_cloud_documents.sql.

create table if not exists public.learning_manifests (
  id uuid primary key default gen_random_uuid(),
  module_id text not null unique references public.modules(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'generating', 'ready', 'error')),
  schema_version text not null default '1.0',
  model text,
  manifest jsonb,
  topic_count integer not null default 0,
  concept_count integer not null default 0,
  source_unit_count integer not null default 0,
  source_char_count integer not null default 0,
  generation_error text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_manifests_module_id_idx on public.learning_manifests(module_id);
create index if not exists learning_manifests_document_id_idx on public.learning_manifests(document_id);

alter table public.learning_manifests enable row level security;
revoke all on table public.learning_manifests from anon, authenticated;
grant all on table public.learning_manifests to service_role;
