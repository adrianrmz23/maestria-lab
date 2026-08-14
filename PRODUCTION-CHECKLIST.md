# Maestría Lab · checklist de producción v1

- [ ] `npm run typecheck` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores.
- [ ] Migraciones 004 → 010 aplicadas en orden.
- [ ] `maestria-documents` continúa como bucket privado.
- [ ] `SUPABASE_SECRET_KEY` NO usa prefijo `NEXT_PUBLIC_`.
- [ ] `OPENAI_API_KEY` está únicamente en variables de servidor.
- [ ] `KIMI_API_KEY`, si existe, está únicamente en variables de servidor.
- [ ] `ELEVENLABS_API_KEY` y `ELEVENLABS_VOICE_ID` están únicamente en variables de servidor.
- [ ] `maestria-audio` es un bucket privado y el audio se reproduce mediante URL firmada.
- [ ] `.env.local` no está versionado.
- [ ] Definir `APP_ACCESS_PASSWORD` si la URL será accesible desde Internet.
- [ ] Probar acceso correcto e incorrecto en una ventana privada.
- [ ] Probar Lector a 375 px y verificar que no exista overflow horizontal.
- [ ] Probar una ayuda IA del Lector y comprobar que se cachea.
- [ ] Construir RAG y verificar citas del Tutor contra el documento.
- [ ] Probar al menos dos módulos en Conexiones.
- [ ] Revisar costos/API antes de recalcular mapas o enriquecer muchas páginas.
- [ ] Hacer copia/export de la base si ya contiene sesiones de estudio importantes.

## v0.8.2 · Biblioteca y lector

- Ejecutar `009_reader_editorial_cleanup.sql` después de la migración 008.
- Reextraer una vez los documentos procesados con versiones anteriores si el Lector muestra texto plano; usa `Actualizar formato` dentro del Lector.
- Probar eliminación de un módulo de prueba y confirmar que desaparecen: objeto de Storage, fila `modules`, `documents`, `document_units`, Manifest, experiencias, intentos, dominio, exámenes, sesiones, RAG, Tutor, anotaciones y conexiones relacionadas.
- No probar `Eliminar` con material que necesites conservar: es una acción destructiva y no tiene papelera en esta versión.


## v1.0.5 · audio y legibilidad

- Ejecutar `010_module_audio_summaries.sql`.
- Probar Aprende en 375 px y desktop: el cuerpo debe leerse cómodamente sin zoom.
- Generar un Resumen breve y confirmar que la segunda reproducción no vuelve a llamar ElevenLabs.
- Probar velocidades 1x, 1.25x, 1.5x y 1.75x en móvil.
- Regenerar solo conscientemente: cada regeneración consume créditos nuevos.
- Si el Manifest cambia, verificar que el audio se marque como desactualizado.
