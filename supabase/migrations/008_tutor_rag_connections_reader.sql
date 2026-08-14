-- Maestría Lab · Bloque 8
-- Tutor IA con RAG, lector enriquecido y conexiones entre módulos.
-- Ejecuta este archivo después de 007_mastery_exams_adaptive.sql.

create extension if not exists vector;

create table if not exists public.rag_chunks (
  id bigint generated always as identity primary key,
  module_id text not null references public.modules(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  unit_index integer not null,
  chunk_index integer not null,
  page_number integer,
  label text,
  content text not null,
  embedding vector(1536) not null,
  embedding_model text not null default 'text-embedding-3-small',
  created_at timestamptz not null default now(),
  unique (document_id, unit_index, chunk_index)
);

create index if not exists rag_chunks_module_idx on public.rag_chunks(module_id, unit_index, chunk_index);
create index if not exists rag_chunks_document_idx on public.rag_chunks(document_id, unit_index, chunk_index);

create or replace function public.match_module_chunks(
  query_embedding vector(1536),
  match_module_id text,
  match_count integer default 6
)
returns table (
  id bigint,
  unit_index integer,
  chunk_index integer,
  page_number integer,
  label text,
  content text,
  similarity double precision
)
language sql
stable
as $$
  select
    rc.id,
    rc.unit_index,
    rc.chunk_index,
    rc.page_number,
    rc.label,
    rc.content,
    1 - (rc.embedding <=> query_embedding) as similarity
  from public.rag_chunks rc
  where rc.module_id = match_module_id
  order by rc.embedding <=> query_embedding
  limit greatest(1, least(match_count, 12));
$$;

create table if not exists public.tutor_threads (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.modules(id) on delete cascade,
  title text not null default 'Sesión de tutor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tutor_messages (
  id bigint generated always as identity primary key,
  thread_id uuid not null references public.tutor_threads(id) on delete cascade,
  module_id text not null references public.modules(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists tutor_threads_module_idx on public.tutor_threads(module_id, updated_at desc);
create index if not exists tutor_messages_thread_idx on public.tutor_messages(thread_id, created_at asc);

create table if not exists public.reader_annotations (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.modules(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  unit_index integer not null,
  phrase text not null,
  kind text not null check (kind in ('concept','example','warning','formula','context')),
  title text not null,
  explanation text not null,
  example text,
  provider text not null,
  model text not null,
  created_at timestamptz not null default now(),
  unique (document_id, unit_index, phrase)
);

create index if not exists reader_annotations_unit_idx on public.reader_annotations(document_id, unit_index);

create table if not exists public.module_connections (
  id uuid primary key default gen_random_uuid(),
  source_module_id text not null references public.modules(id) on delete cascade,
  source_topic_id text not null,
  source_concept_id text not null,
  target_module_id text not null references public.modules(id) on delete cascade,
  target_topic_id text not null,
  target_concept_id text not null,
  relationship_type text not null check (relationship_type in ('prerequisite','analogy','application','shared_principle','contrast','extension')),
  title text not null,
  explanation text not null,
  bridge_example text not null,
  strength integer not null check (strength between 1 and 100),
  source_refs jsonb not null default '[]'::jsonb,
  target_refs jsonb not null default '[]'::jsonb,
  provider text not null,
  model text not null,
  created_at timestamptz not null default now(),
  unique (source_module_id, source_topic_id, source_concept_id, target_module_id, target_topic_id, target_concept_id)
);

create index if not exists module_connections_source_idx on public.module_connections(source_module_id, strength desc);
create index if not exists module_connections_target_idx on public.module_connections(target_module_id, strength desc);

alter table public.rag_chunks enable row level security;
alter table public.tutor_threads enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.reader_annotations enable row level security;
alter table public.module_connections enable row level security;

revoke all on table public.rag_chunks from anon, authenticated;
revoke all on table public.tutor_threads from anon, authenticated;
revoke all on table public.tutor_messages from anon, authenticated;
revoke all on table public.reader_annotations from anon, authenticated;
revoke all on table public.module_connections from anon, authenticated;

revoke execute on function public.match_module_chunks(vector, text, integer) from anon, authenticated;

grant all on table public.rag_chunks to service_role;
grant all on table public.tutor_threads to service_role;
grant all on table public.tutor_messages to service_role;
grant all on table public.reader_annotations to service_role;
grant all on table public.module_connections to service_role;
grant execute on function public.match_module_chunks(vector, text, integer) to service_role;
grant usage, select on all sequences in schema public to service_role;
