-- Maestría Lab · v1.0.5
-- Resúmenes de audio cacheados por módulo.
-- Ejecuta después de 009_reader_editorial_cleanup.sql.

create table if not exists public.module_audio_summaries (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.modules(id) on delete cascade,
  kind text not null check (kind in ('short', 'study')),
  status text not null default 'generating' check (status in ('generating', 'ready', 'error')),
  title text,
  script_text text,
  script_char_count integer not null default 0,
  estimated_seconds integer not null default 0,
  estimated_credits integer not null default 0,
  provider text,
  model text,
  voice_id text,
  storage_bucket text,
  storage_path text,
  manifest_generated_at timestamptz,
  generated_at timestamptz,
  generation_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, kind)
);

create index if not exists module_audio_summaries_module_idx
  on public.module_audio_summaries(module_id, kind);

alter table public.module_audio_summaries enable row level security;
revoke all on table public.module_audio_summaries from anon, authenticated;
grant all on table public.module_audio_summaries to service_role;
