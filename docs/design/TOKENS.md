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
| `--wave-muted` | `#8F8E85` | Texto secundario |
| `--wave-success` | `#2F8F5B` | Estado positivo |
| `--wave-warning` | `#A9791B` | Estado de atención |
| `--wave-danger` | `#B44545` | Error o acción destructiva |
| `--wave-danger-soft` | `#FBEEEE` | Fondo de mensajes de error |

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

## Estados

- Hover: aumenta contraste sin mover el layout.
- Active: fondo azul suave y tinta azul.
- Focus visible: anillo exterior azul.
- Disabled: opacidad al 50 %, cursor bloqueado y sin sombra.
- Error: borde y texto de ayuda rojo.

