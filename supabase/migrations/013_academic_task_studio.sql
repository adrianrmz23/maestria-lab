-- Maestría Lab · Bloque 12
-- Academic Task Studio: tareas por módulo, fuentes adicionales, versiones y revisiones multi-modelo.
-- Ejecuta después de 012_concept_audio_summaries.sql.

create table if not exists public.academic_tasks (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.modules(id) on delete cascade,
  title text not null,
  task_type text not null check (task_type in ('concept_map','synoptic','summary','essay','report','research','infographic','presentation','questions','custom')),
  instructions text not null,
  rubric_text text not null default '',
  status text not null default 'draft' check (status in ('draft','generating','ready','reviewing','completed','error')),
  provider_preference text not null default 'auto' check (provider_preference in ('auto','openai','kimi','deepseek')),
  quality_mode text not null default 'quality' check (quality_mode in ('fast','quality','max')),
  work_mode text not null default 'guided' check (work_mode in ('guided','generate')),
  source_scope jsonb not null default '{"document":true,"manifest":true,"notes":false,"externalResearch":false}'::jsonb,
  requirements jsonb,
  current_version integer not null default 0 check (current_version >= 0),
  generation_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academic_task_versions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.academic_tasks(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  content jsonb not null,
  provider_trace jsonb not null default '[]'::jsonb,
  review jsonb,
  created_at timestamptz not null default now(),
  unique (task_id, version_number)
);

create table if not exists public.academic_task_sources (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.academic_tasks(id) on delete cascade,
  source_kind text not null check (source_kind in ('attachment','instruction','rubric')),
  name text not null,
  mime_type text,
  extracted_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists academic_tasks_module_idx on public.academic_tasks(module_id, updated_at desc);
create index if not exists academic_task_versions_task_idx on public.academic_task_versions(task_id, version_number desc);
create index if not exists academic_task_sources_task_idx on public.academic_task_sources(task_id, created_at asc);

alter table public.academic_tasks enable row level security;
alter table public.academic_task_versions enable row level security;
alter table public.academic_task_sources enable row level security;

revoke all on table public.academic_tasks from anon, authenticated;
revoke all on table public.academic_task_versions from anon, authenticated;
revoke all on table public.academic_task_sources from anon, authenticated;

grant all on table public.academic_tasks to service_role;
grant all on table public.academic_task_versions to service_role;
grant all on table public.academic_task_sources to service_role;
