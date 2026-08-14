-- Maestría Lab · v0.8.2
-- Lector editorial por párrafos + ayudas IA bajo demanda.
-- Ejecuta después de 008_tutor_rag_connections_reader.sql.

alter table public.reader_annotations
  add column if not exists block_index integer;

-- Las anotaciones antiguas no tenían block_index. Se pueden borrar sin afectar la fuente;
-- las nuevas se regeneran bajo demanda y quedan cacheadas por párrafo.
delete from public.reader_annotations where block_index is null;

alter table public.reader_annotations
  drop constraint if exists reader_annotations_document_id_unit_index_phrase_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reader_annotations_document_unit_block_key'
  ) then
    alter table public.reader_annotations
      add constraint reader_annotations_document_unit_block_key unique (document_id, unit_index, block_index);
  end if;
end $$;

create index if not exists reader_annotations_block_idx
  on public.reader_annotations(document_id, unit_index, block_index);
