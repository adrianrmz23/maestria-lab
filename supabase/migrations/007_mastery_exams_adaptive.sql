-- Maestría Lab · Bloque 7
-- Dominio real, evaluaciones y sesiones adaptativas.
-- Ejecuta este archivo después de 006_labs_practice.sql.

create table if not exists public.concept_mastery (
  module_id text not null references public.modules(id) on delete cascade,
  topic_id text not null,
  concept_id text not null,
  mastery_score integer not null default 0 check (mastery_score between 0 and 100),
  weighted_accuracy numeric(6,3) not null default 0,
  evidence_count integer not null default 0,
  practice_count integer not null default 0,
  exam_count integer not null default 0,
  mastery_status text not null default 'Sin evidencia' check (mastery_status in ('Sin evidencia','Inicial','En desarrollo','Sólido','Dominado')),
  weakest_misconception text,
  last_activity_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (module_id, topic_id, concept_id)
);

create table if not exists public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.modules(id) on delete cascade,
  mode text not null check (mode in ('quick','review','full','reinforcement')),
  status text not null default 'ready' check (status in ('ready','in_progress','completed')),
  question_count integer not null check (question_count between 1 and 30),
  exam jsonb not null,
  model text,
  score integer check (score between 0 and 100),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_answers (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.exam_sessions(id) on delete cascade,
  module_id text not null references public.modules(id) on delete cascade,
  topic_id text not null,
  concept_id text not null,
  question_id text not null,
  difficulty integer not null check (difficulty between 1 and 3),
  question_type text not null,
  answer text not null,
  is_correct boolean not null,
  score integer not null check (score between 0 and 100),
  feedback text not null,
  misconception text,
  evaluator_model text,
  created_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.modules(id) on delete cascade,
  duration_minutes integer not null check (duration_minutes in (5,10,15,30,45)),
  status text not null default 'planned' check (status in ('planned','in_progress','completed')),
  plan jsonb not null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists concept_mastery_module_idx on public.concept_mastery(module_id, mastery_score, updated_at desc);
create index if not exists exam_sessions_module_idx on public.exam_sessions(module_id, created_at desc);
create index if not exists exam_answers_module_idx on public.exam_answers(module_id, created_at desc);
create index if not exists exam_answers_concept_idx on public.exam_answers(module_id, topic_id, concept_id, created_at desc);
create index if not exists study_sessions_module_idx on public.study_sessions(module_id, created_at desc);

alter table public.concept_mastery enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.exam_answers enable row level security;
alter table public.study_sessions enable row level security;

revoke all on table public.concept_mastery from anon, authenticated;
revoke all on table public.exam_sessions from anon, authenticated;
revoke all on table public.exam_answers from anon, authenticated;
revoke all on table public.study_sessions from anon, authenticated;

grant all on table public.concept_mastery to service_role;
grant all on table public.exam_sessions to service_role;
grant all on table public.exam_answers to service_role;
grant all on table public.study_sessions to service_role;
grant usage, select on all sequences in schema public to service_role;
