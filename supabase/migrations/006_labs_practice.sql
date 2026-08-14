-- Maestría Lab · Bloque 6
-- Laboratorios interactivos, práctica progresiva y primeros intentos.
-- Ejecuta este archivo después de 005_learning_manifest.sql.

create table if not exists public.learning_experiences (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.modules(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  topic_id text not null,
  concept_id text not null,
  status text not null default 'generating' check (status in ('generating', 'ready', 'error')),
  model text,
  experience jsonb,
  generation_error text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, topic_id, concept_id)
);

create table if not exists public.practice_attempts (
  id bigint generated always as identity primary key,
  module_id text not null references public.modules(id) on delete cascade,
  topic_id text not null,
  concept_id text not null,
  exercise_id text not null,
  level integer not null check (level between 1 and 3),
  exercise_type text not null,
  answer text not null,
  is_correct boolean not null,
  score integer not null check (score between 0 and 100),
  feedback text not null,
  misconception text,
  evaluator_model text,
  created_at timestamptz not null default now()
);

create index if not exists learning_experiences_module_idx on public.learning_experiences(module_id, topic_id, concept_id);
create index if not exists practice_attempts_module_idx on public.practice_attempts(module_id, created_at desc);
create index if not exists practice_attempts_concept_idx on public.practice_attempts(module_id, topic_id, concept_id, created_at desc);

alter table public.learning_experiences enable row level security;
alter table public.practice_attempts enable row level security;

revoke all on table public.learning_experiences from anon, authenticated;
revoke all on table public.practice_attempts from anon, authenticated;
grant all on table public.learning_experiences to service_role;
grant all on table public.practice_attempts to service_role;
grant usage, select on all sequences in schema public to service_role;
