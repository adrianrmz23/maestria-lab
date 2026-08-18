-- Maestría Lab · Bloque 10
-- Motor de aprendizaje: active recall, repetición espaciada, progreso multidimensional,
-- notas inteligentes y proyectos integradores.
-- Ejecuta este archivo después de 010_module_audio_summaries.sql.

-- Ampliar duraciones sin romper sesiones históricas.
alter table public.study_sessions drop constraint if exists study_sessions_duration_minutes_check;
alter table public.study_sessions add constraint study_sessions_duration_minutes_check
  check (duration_minutes in (5,10,15,20,30,40,45));

create table if not exists public.concept_reviews (
  module_id text not null references public.modules(id) on delete cascade,
  topic_id text not null,
  concept_id text not null,
  repetitions integer not null default 0,
  interval_days integer not null default 0,
  ease_factor numeric(5,2) not null default 2.30,
  retention_score integer not null default 0 check (retention_score between 0 and 100),
  last_score integer check (last_score between 0 and 100),
  last_review_at timestamptz,
  due_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (module_id, topic_id, concept_id)
);

create table if not exists public.recall_attempts (
  id bigint generated always as identity primary key,
  module_id text not null references public.modules(id) on delete cascade,
  topic_id text not null,
  concept_id text not null,
  prompt text not null,
  response text not null,
  score integer not null check (score between 0 and 100),
  feedback text not null,
  missing_ideas jsonb not null default '[]'::jsonb,
  misconception text,
  evaluator_model text,
  created_at timestamptz not null default now()
);

create table if not exists public.concept_progress (
  module_id text not null references public.modules(id) on delete cascade,
  topic_id text not null,
  concept_id text not null,
  viewed_at timestamptz,
  recall_score integer check (recall_score between 0 and 100),
  lab_completed boolean not null default false,
  practice_completed boolean not null default false,
  practice_best_score integer check (practice_best_score between 0 and 100),
  completion_score integer not null default 0 check (completion_score between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (module_id, topic_id, concept_id)
);

create table if not exists public.study_notes (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.modules(id) on delete cascade,
  topic_id text not null,
  concept_id text not null,
  note_text text not null,
  recall_question text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.capstone_projects (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.modules(id) on delete cascade,
  title text not null,
  status text not null default 'ready' check (status in ('ready','in_progress','submitted','evaluated')),
  project jsonb not null,
  submission text,
  evaluation jsonb,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists concept_reviews_due_idx on public.concept_reviews(module_id, due_at asc);
create index if not exists recall_attempts_concept_idx on public.recall_attempts(module_id, topic_id, concept_id, created_at desc);
create index if not exists concept_progress_module_idx on public.concept_progress(module_id, updated_at desc);
create index if not exists study_notes_module_idx on public.study_notes(module_id, updated_at desc);
create index if not exists capstone_projects_module_idx on public.capstone_projects(module_id, created_at desc);

alter table public.concept_reviews enable row level security;
alter table public.recall_attempts enable row level security;
alter table public.concept_progress enable row level security;
alter table public.study_notes enable row level security;
alter table public.capstone_projects enable row level security;

revoke all on table public.concept_reviews from anon, authenticated;
revoke all on table public.recall_attempts from anon, authenticated;
revoke all on table public.concept_progress from anon, authenticated;
revoke all on table public.study_notes from anon, authenticated;
revoke all on table public.capstone_projects from anon, authenticated;

grant all on table public.concept_reviews to service_role;
grant all on table public.recall_attempts to service_role;
grant all on table public.concept_progress to service_role;
grant all on table public.study_notes to service_role;
grant all on table public.capstone_projects to service_role;
grant usage, select on all sequences in schema public to service_role;
