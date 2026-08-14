# Maestría Lab · Bloque 8

Bloques 1–7 aprobados. Este ZIP implementa el **Bloque 8 — Tutor IA + RAG + Lector enriquecido + Conexiones + cierre de la v1** sin cambiar la identidad visual editorial/académica aprobada.

## Qué agrega este bloque

### 1. Lector cómodo del documento

Nueva ruta:

```text
/modulos/[slug]/lector
```

Lee directamente las `document_units` ya extraídas, no una reinterpretación de IA.

Incluye:

- tipografía de lectura grande y ajustable;
- ancho cómodo y line-height amplio;
- navegación página/unidad anterior-siguiente;
- diseño específico para teléfono;
- ayudas IA opcionales sobre frases literales de la fuente;
- tooltips/popovers con concepto, ejemplo, advertencia, notación o contexto;
- separación visible entre texto fuente y explicación generada.

Las ayudas se generan **bajo demanda y se guardan en Supabase**. Si `KIMI_API_KEY` está configurada, el enriquecimiento usa Kimi preferentemente; si no, usa OpenAI.

### 2. Tutor IA con RAG

Nueva ruta:

```text
/modulos/[slug]/tutor
```

El Tutor ya no recibe el PDF completo en cada pregunta. Primero crea un índice de fragmentos del documento con embeddings y, para cada pregunta, recupera únicamente los fragmentos más relevantes.

El índice se guarda en `rag_chunks`. Las respuestas del Tutor incluyen citas verificadas a página/unidad y además pueden considerar las debilidades actuales de `concept_mastery`.

El usuario controla cuándo crear/recrear el índice RAG.

### 3. Conexiones reales entre módulos

`/conexiones` dejó de ser mock.

Cuando existen al menos dos Learning Manifests listos, la IA puede descubrir relaciones como:

- prerrequisito;
- analogía;
- aplicación;
- principio compartido;
- contraste;
- extensión.

Cada conexión conserva los IDs exactos de módulo/tema/concepto y permite saltar directamente a Aprende.

Si Kimi está configurado se usa preferentemente para este análisis global de contexto largo. El mapa queda cacheado y solo se recalcula cuando pulsas el botón.

### 4. Kimi opcional y con gasto controlado

Kimi **no** se usa en cada interacción del Tutor.

Su integración se limita a tareas donde el contexto largo puede aportar valor:

1. ayudas del lector;
2. conexiones entre módulos.

Ambas acciones son explícitas y cacheadas. Si no configuras Kimi, todo sigue funcionando mediante OpenAI.

### 5. Protección personal opcional

Para un despliegue privado puedes agregar:

```env
APP_ACCESS_PASSWORD=una-contrasena-larga-y-unica
```

Cuando existe, Maestría Lab protege páginas y API routes con una puerta de acceso y cookie HttpOnly. Si la variable no existe, el proyecto sigue funcionando normalmente en localhost.

Esto no intenta convertir la app en un sistema multiusuario; es una protección sencilla para la instalación personal.

## Nueva migración

Ejecuta únicamente:

```text
supabase/migrations/008_tutor_rag_connections_reader.sql
```

Debe ejecutarse después de 007 y crea/extiende:

- extensión `vector`;
- `rag_chunks`;
- RPC `match_module_chunks`;
- `tutor_threads`;
- `tutor_messages`;
- `reader_annotations`;
- `module_connections`.

## Variables

Mantén los nombres existentes y agrega las opcionales que quieras utilizar:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...

OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# opcional
KIMI_API_KEY=...
KIMI_MODEL=kimi-k2.6

# opcional para despliegue
APP_ACCESS_PASSWORD=...
```

## Ejecutar

```bash
npm install
npm run dev
```

Validaciones recomendadas:

```bash
npm run typecheck
npm run lint
npm run build
```

## Flujo de prueba recomendado

1. Ejecutar migración 008.
2. Abrir un módulo con extracción `ready`.
3. Entrar a **Lector** y revisar tamaño/legibilidad en móvil.
4. Generar ayudas IA para dos páginas/unidades y abrir los tooltips.
5. Volver a esa página y comprobar que las ayudas están cacheadas.
6. Entrar a **Tutor IA** y pulsar **Preparar RAG**.
7. Hacer preguntas que estén y que no estén explícitamente en la fuente.
8. Comprobar las citas de página/unidad del Tutor.
9. Crear un segundo módulo con Manifest listo y generar **Conexiones**.
10. Seguir un puente desde Conexiones hacia Aprende.
11. Si configuras Kimi, revisar `provider/model` en `reader_annotations` y `module_connections`.
12. Probar 375 px y desktop.
13. Ejecutar typecheck, lint y build.

## Re-extracción

Si vuelves a extraer un documento, Maestría Lab invalida automáticamente `rag_chunks` y `reader_annotations` de la versión anterior. Debes reconstruir el índice RAG y regenerar ayudas sobre el nuevo texto para evitar contexto obsoleto.

## Producción

Antes de publicar:

- activa `APP_ACCESS_PASSWORD` si el despliegue será accesible desde Internet;
- comprueba que `SUPABASE_SECRET_KEY`, `OPENAI_API_KEY` y `KIMI_API_KEY` solo estén en variables de servidor;
- ejecuta `npm run build`;
- verifica Storage privado y RLS;
- no subas `.env.local` al repositorio.

Consulta también `PRODUCTION-CHECKLIST.md`.

## Corrección 0.8.1 — extracción PDF en Next/Turbopack



## v0.8.3 · Limpieza para producción

- Se retiró de Biblioteca y Nuevo módulo el panel técnico visible de estado de Supabase/migración local.
- La persistencia cloud, Storage y APIs continúan funcionando internamente sin ese bloque visual.
- Se añadió `DEPLOYMENT.md` con el flujo GitHub → Vercel y las variables necesarias para producción.

## v0.8.2 · Lector editorial y limpieza de Biblioteca

- Ejecuta `supabase/migrations/009_reader_editorial_cleanup.sql` después de la migración 008.
- El lector reconstruye títulos, subtemas, párrafos y listas a partir de la extracción.
- Las ayudas IA se generan por párrafo al pulsar el CTA `Entender mejor este párrafo` y quedan cacheadas.
- Si un documento fue extraído con v0.8.1 o anterior y aparece como texto plano, usa `Actualizar formato` una vez dentro del Lector. Esto vuelve a extraer el documento y, por seguridad, invalida ayudas/RAG antiguos.
- Biblioteca muestra ahora `Eliminar` directamente en cada módulo. En Supabase la eliminación borra el objeto de Storage y las tablas relacionadas caen por `ON DELETE CASCADE`.


## v1.0.2 · Lint / producción

- Compatibilidad de lint con Next.js 16 / React 19.
- Variables locales que chocaban con `module` renombradas.
- Dependencias de hooks corregidas en Manifest y Tutor.
- `postcss.config.mjs` sin export anónimo.
- La regla `react-hooks/set-state-in-effect` se desactiva de forma explícita porque esta v1 usa efectos de cliente para hidratar/cargar estado remoto; se mantienen activas `rules-of-hooks` y `exhaustive-deps`.

## v1.0.5 — extractor PDF serverless

La extracción PDF ya no importa directamente `pdfjs-dist` ni depende de `@napi-rs/canvas`.
Usa `unpdf` con su build serverless de PDF.js y worker embebido, evitando dependencias de
`DOMMatrix`/canvas en Vercel Functions. Los PDFs ya almacenados no necesitan volver a subirse:
tras desplegar esta versión usa **Reintentar extracción**.


## v1.0.5 · lectura más cómoda + resumen en audio

- Se aumenta la tipografía de contenido académico en móvil y desktop, con especial énfasis en Aprende, Fuente, Mesa de estudio IA y Lector.
- Cada módulo puede generar bajo demanda un **Resumen breve** (2–3 min) y un **Resumen de estudio** (5–7 min).
- OpenAI prepara el guion desde el Learning Manifest; ElevenLabs genera el MP3.
- Los MP3 se guardan en el bucket privado `maestria-audio` y se reproducen mediante URLs firmadas. Reproducir no vuelve a consumir créditos.
- `eleven_flash_v2_5` es el modelo predeterminado para equilibrar costo/calidad. `ELEVENLABS_MODEL` permite cambiarlo sin tocar código.
- La regeneración es manual y pide confirmación porque vuelve a consumir créditos.
- Si regeneras el Learning Manifest, el audio anterior queda marcado como desactualizado.

Variables nuevas:

```env
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
ELEVENLABS_MODEL=eleven_flash_v2_5
```

Migración nueva: `010_module_audio_summaries.sql`.

## v1.0.6 — Cuestionario dentro de Aprende + Profundizar compacto

- Añade una capa **Cuestionario** entre Nivel Maestría y Profundizar.
- Reutiliza la experiencia práctica ya cacheada por concepto: mínimo 6 preguntas y prioridad a razonamiento/transferencia.
- Las respuestas alimentan `practice_attempts` y, por tanto, Dominio; no crea un historial paralelo.
- Las pistas permanecen cerradas por defecto.
- La generación de ejercicios exige casos nuevos, justificación y distractores plausibles; evita memoria literal trivial.
- **Profundizar** muestra por defecto una versión compacta. Los Manifests nuevos limitan esa capa a 120–180 palabras en tres microbloques; los Manifests antiguos largos se colapsan en la UI y permiten abrir el desarrollo completo bajo demanda.
- No requiere una migración nueva de Supabase.
