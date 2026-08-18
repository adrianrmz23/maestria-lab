# Bloque 12.3 · External Resource Embeds

## Objetivo

Usar un hosting propio como biblioteca multimedia sin obligar al estudiante a salir de Maestría Lab.

## Implementado

- URLs externas de audio, video, PDF, imágenes y mapas se abren dentro de Maestría Lab.
- Audio externo funciona también directamente dentro de Recursos relacionados de una lección.
- Video/PDF/imagen/mapa relacionado abre el mismo visor interno reutilizable.
- Reproductores de audio/video incluyen cambio de velocidad.
- Imágenes/mapas incluyen zoom.
- El visor PDF incluye fallback “Abrir original”.
- El Resource Hub detecta automáticamente formatos comunes a partir de la extensión de la URL.
- Advertencia para URLs HTTP porque el deployment de Vercel usa HTTPS.
- Nuevo módulo permite registrar múltiples URLs del hosting durante la creación, además de subir archivos a Supabase.
- Las URLs siguen guardándose en `module_resources.external_url`; no consumen Supabase Storage.
- No hay nueva migración SQL. Se sigue usando `014_module_resources.sql`.

## Archivos principales

- `src/components/resources/resource-preview-modal.tsx`
- `src/components/resources/module-resource-hub.tsx`
- `src/components/resources/concept-resource-strip.tsx`
- `src/components/new-module-form.tsx`
- `src/lib/resources/client.ts`
- `src/app/api/modules/[id]/resources/route.ts`
- `HOSTING-RESOURCES-SETUP.md`
- `hosting-resources.htaccess.example`

## Hosting

Para archivos pesados se recomienda cPanel/SFTP/FTP en una carpeta dedicada, por ejemplo `/public_html/maestria/`, en vez de WordPress Media Library. Consulta `HOSTING-RESOURCES-SETUP.md`.
