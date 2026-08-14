-- Maestría Lab · Bloque 4
-- Persistencia de módulos, documentos y extracción de contenido.
-- Ejecuta este archivo completo en Supabase SQL Editor una sola vez.

create extension if not exists pgcrypto;

create table if not exists public.modules (
  id text primary key,
  slug text not null unique,
  title text not null,
  subject text not null,
  description text not null default '',
  progress integer not null default 0 check (progress between 0 and 100),
  topics integer not null default 0 check (topics >= 0),
  status text not null default 'Nuevo' check (status in ('Nuevo', 'En curso', 'Completado', 'Archivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  module_id text not null unique references public.modules(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('PDF', 'DOCX')),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  last_modified bigint not null,
  storage_bucket text not null default 'maestria-documents',
  storage_path text not null unique,
  extraction_status text not null default 'pending' check (extraction_status in ('pending', 'extracting', 'ready', 'error')),
  page_count integer,
  unit_count integer not null default 0,
  char_count integer not null default 0,
  word_count integer not null default 0,
  parser text,
  parser_version text,
  preview_text text,
  extracted_text text,
  extraction_error text,
  extracted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_units (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.documents(id) on delete cascade,
  unit_index integer not null check (unit_index > 0),
  page_number integer,
  label text,
  content text not null,
  char_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (document_id, unit_index)
);

create index if not exists modules_updated_at_idx on public.modules(updated_at desc);
create index if not exists documents_module_id_idx on public.documents(module_id);
create index if not exists document_units_document_id_idx on public.document_units(document_id, unit_index);

alter table public.modules enable row level security;
alter table public.documents enable row level security;
alter table public.document_units enable row level security;

-- El Bloque 4 usa únicamente rutas server-side con SUPABASE_SECRET_KEY.
-- No exponemos estas tablas al rol anónimo mientras no exista autenticación.
revoke all on table public.modules from anon, authenticated;
revoke all on table public.documents from anon, authenticated;
revoke all on table public.document_units from anon, authenticated;
grant all on table public.modules to service_role;
grant all on table public.documents to service_role;
grant all on table public.document_units to service_role;
grant usage, select on all sequences in schema public to service_role;

insert into public.modules (id, slug, title, subject, description, progress, topics, status, created_at, updated_at)
values
  (
    'module-logic',
    'logica-proposicional',
    'Lógica proposicional y de predicados',
    'Bases Científicas de la Inteligencia Artificial',
    'Fundamentos formales para representar proposiciones, relaciones lógicas, predicados e inferencia aplicados a sistemas inteligentes.',
    32,
    11,
    'En curso',
    '2026-08-10T16:00:00.000Z',
    '2026-08-13T20:00:00.000Z'
  ),
  (
    'module-statistics',
    'estadistica-descriptiva',
    'Estadística descriptiva',
    'Fundamentos de Ciencia de Datos',
    'Medidas, distribuciones y formas de describir datos antes de construir modelos o realizar inferencias.',
    0,
    8,
    'Nuevo',
    '2026-08-11T16:00:00.000Z',
    '2026-08-11T16:00:00.000Z'
  ),
  (
    'module-algebra',
    'algebra-lineal-ia',
    'Álgebra lineal para IA',
    'Matemáticas para Inteligencia Artificial',
    'Vectores, matrices y transformaciones como lenguaje matemático base de múltiples técnicas de inteligencia artificial.',
    67,
    12,
    'En curso',
    '2026-08-09T16:00:00.000Z',
    '2026-08-12T20:00:00.000Z'
  )
on conflict (id) do nothing;
