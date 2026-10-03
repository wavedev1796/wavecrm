# Tokens visuales de Wave CRM

La fuente de verdad ejecutable vive en `apps/web/app/globals.css`. La guía visual original está en `docs/design/crm-wave-styleguide.html`.

## Color

| Token | Valor | Uso |
| --- | --- | --- |
| `--wave-blue` | `#2F6F8F` | Acción principal, navegación activa, foco |
| `--wave-blue-dark` | `#255A74` | Hover de acción principal |
| `--wave-tint` | `#EAF2F6` | Fondos activos e informativos |
| `--wave-ink` | `#1F1F1F` | Texto y superficies de alto contraste |
| `--wave-page` | `#FAF9F5` | Fondo de aplicación |
| `--wave-cream` | `#F5F6EC` | Superficie secundaria |
| `--wave-white` | `#FFFFFF` | Superficie dominante |
| `--wave-muted` | `#8F8E85` | Texto secundario decorativo (no apto para texto pequeño: 3,4:1 sobre blanco) |
| `--wave-muted-strong` | `#6B6A63` | Texto secundario y placeholders que deben pasar AA (5,4:1 sobre blanco) |
| `--wave-success` | `#2F8F5B` | Estado positivo en iconos y fondos |
| `--wave-success-strong` | `#25744A` | Texto de estado positivo (5,7:1 sobre blanco) |
| `--wave-warning` | `#A9791B` | Estado de atención |
| `--wave-danger` | `#B44545` | Error o acción destructiva |
| `--wave-danger-soft` | `#FBEEEE` | Fondo de mensajes de error |

## Marca

El logotipo vive en `apps/web/public/logo-wave.svg` (wordmark horizontal, proporción 2.12:1). Se pinta con la clase `.brand-logo`, que lo aplica como máscara CSS sobre `currentColor`: un solo archivo sirve para cualquier color según el contexto (azul en el sidebar, blanco sobre el panel oscuro de las pantallas de acceso). Al usarlo, fijar `width`/`height` respetando la proporción y acompañarlo del descriptor `CRM` (`.brand-tag`).

## Tipografía y escala

- Familia: Plus Jakarta Sans Variable.
- Display: `2rem / 800`.
- Título de página: `1.5rem / 800`.
- Título de sección: `1.125rem / 700`.
- Cuerpo: `1rem / 400–600`.
- Etiqueta y metadato: `0.75–0.875rem / 600–700`.
- Montos usan números tabulares.

## Forma, espacio y movimiento

- Radios: `8px`, `10px`, `14px`, `18px`.
- Escala espacial: `4, 8, 12, 16, 24, 32px`.
- Borde: `#EDECE5`; foco: anillo azul de `3px`.
- Sombras bajas para separar superficies, nunca como decoración dominante.
- Transiciones funcionales de `160ms`; se desactivan con `prefers-reduced-motion`.
- Excepción, pantallas de acceso (`/login`, `/activar-cuenta`, `/recuperar-contrasena`): entrada escalonada de 200–280 ms con `cubic-bezier(.16, 1, .3, 1)`, hover y focus a 200 ms y flotación de 6 s en la tarjeta "Vista de ejemplo". Todo se desactiva con `prefers-reduced-motion`.
- Panel de marca de acceso: gradiente de 155° `#2F6F8F → #22536B → #172A33`; texto secundario en blanco al 90 %.

## Estados

- Hover: aumenta contraste sin mover el layout.
- Active: fondo azul suave y tinta azul.
- Focus visible: anillo exterior azul.
- Disabled: opacidad al 50 %, cursor bloqueado y sin sombra.
- Error: borde y texto de ayuda rojo.

## Controles de formulario

Input (`.input`) y select (componente `Select`, clase `.select-control`) comparten la misma piel, para que un formulario se lea como un solo bloque:

- 40 px de alto, borde `--wave-line-strong`, radio `10px`, fondo blanco, texto `0.82rem`.
- Hover: borde `#C8C7BF`. Foco: borde `--wave-blue` y anillo de 3 px `--wave-blue-soft`.
- Error (`aria-invalid`): borde `--wave-danger` y, con foco, anillo `--wave-danger-soft`.
- Deshabilitado: fondo `#F1F0EB` y cursor bloqueado; el select pone el texto en `--wave-muted` y conserva su flecha.
- Select: sin la apariencia nativa del sistema; flecha propia dibujada con dos gradientes de 5 px en `--wave-muted-strong`. Donde el navegador admite `appearance: base-select`, la lista desplegable también lleva la piel de Wave: borde `--wave-line-strong`, radio `12px`, `--shadow-md` y la opción activa o elegida en `--wave-blue-soft` con texto `--wave-blue-dark`.
  - La lista mide como máximo `min(18rem, 50dvh)` (unas siete opciones) y se desplaza por dentro: países, provincias y cantones no tapan la pantalla.
  - La opción con foco de teclado lleva un contorno de 2 px `--wave-blue-line` hacia dentro, para distinguirla de la elegida.
  - El valor elegido va en una sola línea y se corta antes de la flecha (p. ej. «Emiratos Árabes Unidos (+971)» en el prefijo del teléfono).
- Todos los selects de la web (tipo de documento, prefijo del teléfono, provincia, cantón, filtros, rol de usuario y columnas de importación) usan el componente `Select`; no hay `<select>` sueltos.
- En móvil (≤ 560 px), inputs y selects de los formularios de contacto y empresa (`.contact-form`) suben a 44 px y `1rem`.
- Campo obligatorio: `*` después de la etiqueta, en el color de la etiqueta y oculto al lector de pantalla (el control lleva `aria-required`). El formulario lo explica en su cabecera.
- Ayuda bajo el campo (`.field-hint`): `0.72rem / 550`, `--wave-muted-strong`, enlazada al control con `aria-describedby`.

