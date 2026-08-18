# Hotfix 12.1 · Typecheck

Corrige los dos errores detectados al ejecutar `npm run typecheck` después del Bloque 12.

## Correcciones

1. `src/lib/learning-engine/server.ts`
   - `recall_question` viene de una fila tipada como `Record<string, unknown>`.
   - Ahora se normaliza explícitamente a `string | null` con `typeof row.recall_question === "string"`.

2. `src/lib/tasks/export.ts`
   - Se eliminó `pptx.lang = "es-MX"` porque `lang` no forma parte de la API tipada de `PptxGenJS` 4.x.
   - No afecta la generación del archivo PPTX.

Después de reemplazar el proyecto o estos archivos, ejecuta:

```bash
npm install
npm run typecheck
```
