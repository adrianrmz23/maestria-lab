# Maestría Lab · GitHub + Vercel

## 1. Antes de subir

Desde la raíz del proyecto:

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

`.env.local` NO debe subirse. El `.gitignore` del proyecto ya excluye `.env*` excepto `.env.example`.

## 2. GitHub

Repositorio:

`https://github.com/adrianrmz23/maestria-lab.git`

Desde PowerShell / Terminal, dentro de la raíz del proyecto:

```bash
git init
git add .
git commit -m "Initial release Maestria Lab"
git branch -M main
git remote add origin https://github.com/adrianrmz23/maestria-lab.git
git remote -v
git push -u origin main
```

Después de cambios futuros:

```bash
git add .
git commit -m "Describe el cambio"
git push
```

## 3. Vercel

1. Vercel Dashboard → Add New → Project.
2. Importar `adrianrmz23/maestria-lab`.
3. Framework Preset: Next.js.
4. Root Directory: `./`.
5. Mantener Build/Install/Output con los valores detectados por Vercel.
6. Agregar las variables de entorno antes del primer deploy.

### Variables obligatorias

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
OPENAI_API_KEY
OPENAI_MODEL
OPENAI_EMBEDDING_MODEL
```

Valores recomendados para las dos variables de modelo si quieres conservar la configuración local:

```text
OPENAI_MODEL=gpt-5-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### Kimi / Moonshot · opcional

```text
KIMI_API_KEY
KIMI_MODEL=kimi-k2.6
```

### ElevenLabs · audio por módulo

```text
ELEVENLABS_API_KEY
ELEVENLABS_VOICE_ID
ELEVENLABS_MODEL=eleven_flash_v2_5
```

`ELEVENLABS_VOICE_ID` es el ID de la voz que quieras usar. Ninguna de estas variables debe usar `NEXT_PUBLIC_`.

Antes de generar audio ejecuta también la migración `010_module_audio_summaries.sql` en Supabase. El bucket privado `maestria-audio` se crea automáticamente al generar el primer audio.

### Protección personal · muy recomendada

```text
APP_ACCESS_PASSWORD=una-contrasena-larga-y-unica
```

No uses prefijo `NEXT_PUBLIC_` para `SUPABASE_SECRET_KEY`, `OPENAI_API_KEY`, `KIMI_API_KEY` ni `APP_ACCESS_PASSWORD`.

7. Deploy.
8. Si modificas una variable después, crea un nuevo deployment/redeploy para que la nueva variable se aplique.

## 4. Prueba rápida después de producción

- Abrir la URL de Vercel.
- Verificar la pantalla de acceso si configuraste `APP_ACCESS_PASSWORD`.
- Abrir Biblioteca.
- Crear un módulo temporal.
- Subir un PDF.
- Confirmar extracción.
- Abrir Lector.
- Generar una ayuda IA al final de un párrafo.
- Preparar RAG y hacer una pregunta al Tutor.
- Eliminar el módulo temporal y confirmar que desaparece de Biblioteca.

## 5. Actualización v1.0.4 · extracción PDF en Vercel

Esta versión reemplaza la extracción directa con `pdfjs-dist`/canvas por `unpdf` serverless.
Después de reemplazar el proyecto ejecuta `npm install` para actualizar `package-lock.json`,
sube también ese lockfile a GitHub y espera el nuevo deployment de Vercel. Los PDFs que ya
están en Supabase Storage no deben volver a subirse: usa **Reintentar extracción**.


## 6. Actualización v1.0.5 · tipografía + audio

Después de actualizar el repositorio:

1. Ejecuta `010_module_audio_summaries.sql` en Supabase SQL Editor.
2. Configura `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` y `ELEVENLABS_MODEL` en Vercel.
3. Haz Redeploy.
4. Abre un módulo con Learning Manifest listo.
5. Genera primero **Resumen breve** para validar voz/costo y después, si te gusta, **Resumen de estudio**.

Los audios se guardan en Storage y no se vuelven a generar al reproducirlos. Regenerar sí consume créditos de nuevo.
