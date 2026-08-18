# Supabase · Maestría Lab Bloque 8

## Variables existentes

Conserva exactamente:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
OPENAI_API_KEY=sk-proj_...
OPENAI_MODEL=gpt-5-mini
```

## Variables nuevas opcionales

```env
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
KIMI_API_KEY=...
KIMI_MODEL=kimi-k2.6
APP_ACCESS_PASSWORD=...
```

`KIMI_API_KEY` no es obligatoria. Sin ella, lector/conexiones usan OpenAI.

## Migración

Ve a **Supabase → SQL Editor → New query** y ejecuta completo:

```text
supabase/migrations/008_tutor_rag_connections_reader.sql
```

Debe ejecutarse después de 007.

### Qué crea

`rag_chunks`

Fragmentos del texto extraído + embeddings de 1536 dimensiones para recuperación semántica.

`match_module_chunks(...)`

RPC de similitud vectorial limitada al módulo actual.

`tutor_threads` / `tutor_messages`

Conversaciones persistentes del Tutor y sus citas.

`reader_annotations`

Ayudas contextuales cacheadas por documento/unidad/frase.

`module_connections`

Puentes validados entre conceptos de módulos distintos.

## Seguridad

Las nuevas tablas usan RLS y revocan acceso directo a `anon`/`authenticated`. Las operaciones del Bloque 8 pasan por rutas server-side con `SUPABASE_SECRET_KEY`.

El bucket de documentos continúa privado.

## Verificación rápida

Después de preparar el Tutor:

```text
rag_chunks
```

debe contener varios fragmentos del módulo.

Después de usar el Tutor:

```text
tutor_threads
tutor_messages
```

Después de enriquecer el lector:

```text
reader_annotations
```

Después de calcular el mapa:

```text
module_connections
```

Si configuraste Kimi, revisa las columnas `provider` y `model` de `reader_annotations` y `module_connections`.


## v0.8.2 · Lector editorial y limpieza de Biblioteca

- Ejecuta `supabase/migrations/009_reader_editorial_cleanup.sql` después de la migración 008.
- El lector reconstruye títulos, subtemas, párrafos y listas a partir de la extracción.
- Las ayudas IA se generan por párrafo al pulsar el CTA `Entender mejor este párrafo` y quedan cacheadas.
- Si un documento fue extraído con v0.8.1 o anterior y aparece como texto plano, usa `Actualizar formato` una vez dentro del Lector. Esto vuelve a extraer el documento y, por seguridad, invalida ayudas/RAG antiguos.
- Biblioteca muestra ahora `Eliminar` directamente en cada módulo. En Supabase la eliminación borra el objeto de Storage y las tablas relacionadas caen por `ON DELETE CASCADE`.


# v1.0.5 · Resúmenes en audio

Ejecuta después de 009:

```text
supabase/migrations/010_module_audio_summaries.sql
```

Crea `module_audio_summaries`. El bucket privado `maestria-audio` se crea automáticamente desde servidor cuando generas el primer MP3.

## Bloque 12 · Academic Task Studio

Después de la migración 012 ejecuta también:

`supabase/migrations/013_academic_task_studio.sql`

Esta migración agrega tareas académicas, historial de versiones y fuentes adicionales por tarea.
