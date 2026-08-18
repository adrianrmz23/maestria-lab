# Maestría Lab · Recursos desde hosting propio

Esta versión permite registrar URLs externas y reproducir/visualizar dentro de Maestría Lab los recursos compatibles.

## Recomendación de almacenamiento

Para archivos grandes (audio, video, PDF), se recomienda usar una carpeta dedicada del hosting, administrada desde cPanel o SFTP/FTP, en lugar de la Biblioteca de Medios de WordPress.

Ejemplo:

```text
public_html/
└── maestria/
    ├── logica/
    │   ├── audio/
    │   ├── video/
    │   └── pdf/
    ├── estadistica/
    └── algebra/
```

URLs resultantes:

```text
https://tudominio.com/maestria/logica/audio/logica-ia.mp3
https://tudominio.com/maestria/logica/video/explicacion.mp4
https://tudominio.com/maestria/logica/pdf/resumen.pdf
```

También es buena idea usar un subdominio como `recursos.tudominio.com` si tu hosting lo permite.

## .htaccess sugerido

Colócalo dentro de la carpeta pública que contiene los recursos, por ejemplo `public_html/maestria/.htaccess`.

```apache
<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "https://maestria-lab.vercel.app"
    Header set Access-Control-Allow-Methods "GET, HEAD, OPTIONS"
    Header set Access-Control-Allow-Headers "Range, Content-Type"
    Header set Access-Control-Expose-Headers "Accept-Ranges, Content-Length, Content-Range"
</IfModule>

AddType audio/mpeg .mp3
AddType audio/mp4 .m4a
AddType audio/wav .wav
AddType audio/ogg .ogg

AddType video/mp4 .mp4
AddType video/webm .webm

AddType application/pdf .pdf

<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType audio/mpeg "access plus 30 days"
    ExpiresByType audio/mp4 "access plus 30 days"
    ExpiresByType video/mp4 "access plus 30 days"
    ExpiresByType video/webm "access plus 30 days"
    ExpiresByType application/pdf "access plus 7 days"
</IfModule>
```

Apache normalmente soporta HTTP Range de forma nativa. Es importante para poder adelantar y retroceder en audios/videos grandes sin descargar el archivo completo.

## Qué URL pegar en Maestría Lab

Usa una URL directa al archivo, no una página de WordPress que contenga el archivo.

Correcto:

```text
https://tudominio.com/maestria/logica/audio/logica-ia.mp3
```

Menos recomendable:

```text
https://tudominio.com/mi-pagina-con-el-audio/
```

La URL debe usar HTTPS para evitar bloqueo de contenido mixto en Vercel.

## Qué se incrusta dentro de Maestría Lab

- MP3/M4A/WAV/OGG: reproductor interno con velocidad.
- MP4/WEBM: video interno con controles y velocidad.
- PDF: visor integrado en modal, con botón de apertura directa como respaldo.
- PNG/JPG/WEBP/GIF: visor interno con zoom.
- Mapas guardados como imagen: visor interno.
- PPTX/DOCX y otros formatos: se conservan como recurso, pero se abren en el navegador porque no existe un visor universal fiable dentro de la app.

## Si el visor falla

1. Comprueba que la URL abre directamente el archivo en Chrome.
2. Confirma que usa HTTPS.
3. Para audio/video, comprueba que puedes saltar a otra parte de la línea de tiempo.
4. Si un PDF no se deja incrustar, revisa reglas del hosting como `X-Frame-Options` o `Content-Disposition`.
5. Revisa que plugins de seguridad/hotlink protection no bloqueen solicitudes desde `maestria-lab.vercel.app`.
