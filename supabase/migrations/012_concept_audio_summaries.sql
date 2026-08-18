-- Maestría Lab · Bloque 10.1
-- Audio contextual por lección/concepto.
-- Ejecuta este archivo después de 011_learning_engine.sql.

create table if not exists public.concept_audio_summaries (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.modules(id) on delete cascade,
  topic_id text not null,
  concept_id text not null,
  kind text not null default 'lesson' check (kind in ('lesson')),
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
  unique (module_id, topic_id, concept_id, kind)
);

create index if not exists concept_audio_summaries_lookup_idx
  on public.concept_audio_summaries(module_id, topic_id, concept_id, kind);

alter table public.concept_audio_summaries enable row level security;
revoke all on table public.concept_audio_summaries from anon, authenticated;
grant all on table public.concept_audio_summaries to service_role;
