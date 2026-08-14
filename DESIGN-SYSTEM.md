# Maestría Lab — Dirección visual

Esta dirección visual se deriva del brief del proyecto y del flujo de trabajo de UI UX Pro Max: primero definir el producto/contexto, después un sistema coherente, y finalmente validar responsive, interacción y accesibilidad.

## Identidad

**Concepto:** cuaderno de investigación + biblioteca académica + herramienta digital contemporánea.

La interfaz debe sentirse como un espacio personal de estudio para una maestría, no como un dashboard SaaS, un CRM, un panel de agentes ni una app religiosa.

### Palabras clave

- editorial
- académico
- sereno
- premium
- content-first
- preciso
- adulto
- experimental

## Reglas visuales

- Navegación principal horizontal en desktop; evitar sidebar global fija.
- Jerarquía editorial con serif en títulos y sans serif en interfaz/contenido.
- Metadatos pequeños en monoespaciada para reforzar sensación de índice/laboratorio.
- Usar líneas, índices, fichas y márgenes antes que colecciones de tarjetas redondeadas.
- Radio mínimo o inexistente en superficies estructurales.
- Evitar gradientes de IA, glassmorphism, glow, neón y tarjetas KPI.
- Evitar el patrón visual usado en Nexus AI Office / Ecos de Fe: sidebar oscura + tarjetas redondeadas + menta.

## Paleta

- Canvas: `#F1EEE6`
- Surface: `#FBFAF6`
- Ink: `#1C2528`
- Muted: `#65706D`
- Line: `#D8D1C3`
- Accent / óxido: `#9B4A3D`
- Accent soft: `#F3E2DC`
- Moss: `#456258`
- Moss soft: `#DFE9E4`

El color no debe ser la única señal de estado.

## Tipografía

- Display: Iowan Old Style / Palatino / Georgia fallback.
- UI y lectura: Inter / system sans.
- Metadatos: SFMono / Consolas / Menlo fallback.

Cuerpo mínimo móvil: 16 px cuando se trata de lectura/formularios. Metadatos pueden ser menores porque no son contenido principal y siempre tienen alto contraste.

## Layout

- Contenedor principal: aproximadamente 1120–1180 px.
- Desktop: navegación superior persistente.
- Mobile: barra inferior de máximo 4 destinos principales.
- Separación por reglas horizontales y columnas, no por tarjetas flotantes repetitivas.
- Sin overflow horizontal a 375 px.

## Componentes

### Módulos
Formato de catálogo/índice:
- número grande;
- materia;
- título;
- estado;
- progreso lineal;
- acción implícita sobre toda la fila.

### Progreso
Formato de registro/ledger:
- concepto;
- lectura cualitativa;
- barra fina;
- porcentaje;
- foco de refuerzo separado.

### Módulo
Formato de syllabus:
- encabezado editorial;
- tabs lineales;
- índice numerado;
- ficha de estudio contextual.

## Interacción

- Touch targets de 44×44 px o mayores.
- Estados hover sin modificar layout.
- Focus visible.
- Transiciones de color de 150–300 ms.
- Respetar `prefers-reduced-motion`.

## Responsive

Revisar explícitamente:
- 375 px
- 768 px
- 1024 px
- 1440 px

En móvil no comprimir el desktop: reorganizar columnas, mantener lectura cómoda y usar navegación inferior.

### Documento fuente
Formato de ficha técnica, no de "upload SaaS":
- área de ingreso con borde discontinuo y jerarquía editorial;
- archivo asociado como registro técnico con nombre, formato, peso y estado;
- acciones secundarias alineadas al registro, sin menú flotante innecesario;
- pipeline posterior visible como secuencia numerada;
- estados de error con borde/etiqueta, nunca solo con color;
- evitar reemplazo silencioso del documento fuente.

## Bloque 4 · infraestructura visible sin estética de panel técnico

- Los estados de Supabase/Storage deben aparecer como notas editoriales integradas, no como dashboard de infraestructura.
- La extracción se representa como una secuencia de fuente → extracción → unidades → Learning Manifest.
- Los datos técnicos (páginas, palabras, caracteres, parser) usan ficha/ledger, no tarjetas KPI.
- El inspector de extracción mantiene lectura cómoda y referencias de página/unidad.
- Los errores de extracción no cambian el lenguaje visual global ni introducen modales SaaS genéricos.

## Bloque 6 · aprendizaje activo sin gamificación decorativa

- Laboratorio y Practica deben sentirse como mesas de trabajo académicas, no como minijuegos infantiles.
- La interactividad usa reglas, tablas, fichas, estados binarios y controles directos; evitar confeti, puntos, badges o estética arcade.
- Cada laboratorio muestra objetivo, protocolo, dificultad y relación con el concepto antes de la interacción.
- La IA elige únicamente entre componentes registrados por la aplicación; nunca genera HTML/UI arbitraria.
- Practica conserva progresión clara: Nivel 1 guiado, Nivel 2 semiguiado, Nivel 3 transferencia.
- El feedback correcto/incorrecto siempre incluye explicación; el color no es la única señal.
- La Mesa de estudio IA vive dentro de Aprende como herramienta contextual. No debe convertirse visualmente en un chat flotante genérico.
- Las respuestas IA mantienen tipografía de lectura, referencias de fuente visibles y código solo cuando aporta valor.

## Bloque 7 · dominio sin dashboard corporativo

- Dominio se presenta como ledger/índice académico, no como colección de KPI cards.
- El porcentaje siempre aparece acompañado de evidencia y estado cualitativo.
- No gamificar con medallas, streaks decorativos, confeti o rankings.
- Los conceptos débiles se muestran como prioridad de estudio, no como fallo personal.
- Evaluación mantiene lectura editorial y una pregunta principal por pantalla; evitar apariencia de formulario escolar genérico.
- Las sesiones adaptativas se leen como plan de estudio editorial con minutos y pasos, no como timeline SaaS.
- “Rigor claro” debe priorizar densidad útil y comprensión: breve, técnico y legible. “Profundizar” conserva el espacio para extensión mayor.

## 14. Patrón de lectura académica · Bloque 8

El Lector es una excepción deliberada al patrón de densidad de las pantallas de gestión:

- columna de lectura máxima aproximada de `74ch`;
- tamaño predeterminado cercano a 19–20 px y line-height amplio;
- controles A− / A / A+;
- fuente original siempre visualmente dominante;
- ayudas IA como subrayado punteado discreto, nunca resaltado masivo;
- en móvil las ayudas se abren como panel inferior táctil; en desktop como popover contextual;
- cada ayuda debe indicar que es una capa generada y conservar proveedor/modelo;
- las explicaciones nunca sustituyen, reescriben ni silencian el texto fuente.

Este patrón debe reutilizarse en futuros lectores, referencias y modos de estudio extensivo.
