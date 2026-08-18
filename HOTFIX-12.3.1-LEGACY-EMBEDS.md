# Hotfix 12.3.1 — Recursos externos guardados como enlace

Este hotfix corrige recursos externos creados antes de que Maestría Lab soportara embeds.

Si un registro existente quedó con `resource_type = link` o `other`, pero su `external_url` termina en un formato reconocible como `.mp3`, `.m4a`, `.wav`, `.ogg`, `.mp4`, `.webm`, `.mov`, `.pdf` o imagen, la API normaliza el tipo al leerlo.

Ejemplo:

`https://dominio.com/maestria/logica/audio.m4a`

Aunque Supabase tenga el registro antiguo como `link`, la interfaz lo recibirá como `audio` y mostrará **Reproducir aquí**.

No requiere migración de Supabase y no modifica los archivos del hosting.
