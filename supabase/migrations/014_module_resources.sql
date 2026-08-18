-- Maestría Lab · Bloque 12.2
-- Hub de recursos adicionales por módulo, tema o concepto.
-- Ejecuta después de 013_academic_task_studio.sql.

create table if not exists public.module_resources (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.modules(id) on delete cascade,
  topic_id text,
  concept_id text,
  title text not null,
  resource_type text not null default 'other' check (resource_type in (
    'audio','pdf','document','presentation','image','video','map','summary','quiz','link','other'
  )),
  source text not null default 'Recurso externo',
  original_name text,
  mime_type text,
  size_bytes bigint,
  storage_bucket text,
  storage_path text,
  external_url text,
  duration_seconds integer,
  pinned boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint module_resources_has_source check (
    (storage_bucket is not null and storage_path is not null) or external_url is not null
  )
);

create index if not exists module_resources_module_idx
  on public.module_resources(module_id, pinned desc, sort_order asc, created_at desc);
create index if not exists module_resources_concept_idx
  on public.module_resources(module_id, topic_id, concept_id);

alter table public.module_resources enable row level security;
revoke all on table public.module_resources from anon, authenticated;
grant all on table public.module_resources to service_role;
