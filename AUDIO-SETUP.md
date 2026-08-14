# Maestría Lab · ElevenLabs Audio

## Qué genera

Cada módulo puede crear, manualmente, dos audios:

- **Resumen breve**: 2–3 minutos.
- **Resumen de estudio**: 5–7 minutos y cobertura de todos los temas del Learning Manifest.

OpenAI crea primero el guion; ElevenLabs solo convierte ese guion a voz. El MP3 se guarda en Supabase Storage y reproducirlo después no vuelve a consumir créditos.

## 1. Supabase

Ejecuta en SQL Editor:

```text
supabase/migrations/010_module_audio_summaries.sql
```

El bucket privado `maestria-audio` se crea automáticamente al generar el primer audio.

## 2. ElevenLabs

1. Crea/abre tu cuenta de ElevenLabs.
2. Crea una API key.
3. En Voices selecciona una voz que te guste para español y copia su `voice_id`.
4. Configura estas variables tanto en `.env.local` como en Vercel:

```env
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
ELEVENLABS_MODEL=eleven_flash_v2_5
```

`eleven_flash_v2_5` es el valor predeterminado para controlar costo. Si posteriormente priorizas calidad sobre costo, puedes probar `eleven_multilingual_v2`.

## 3. Flujo recomendado para cuidar créditos

1. Genera primero **Resumen breve**.
2. Escucha voz, pronunciación y ritmo.
3. Solo si te convence, genera **Resumen de estudio**.
4. No pulses Regenerar salvo que quieras una nueva narración: regenerar consume créditos nuevamente.
5. Reproducir un MP3 ya guardado no llama a ElevenLabs.

Maestría Lab muestra una estimación de créditos basada en caracteres del guion y el modelo configurado.
