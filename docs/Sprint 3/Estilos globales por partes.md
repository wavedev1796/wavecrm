# Estilos globales por partes

**Responsable:** Zaith Manangón · **Estado:** Completo (5/5 criterios). Tarea 05 de `Tareas Sprint 3/`, pedida por el usuario el 2026-10-12.

## Objetivo

Partir `apps/web/app/globals.css`, de casi 3.000 líneas, en archivos ordenados bajo `apps/web/styles/` sin cambiar ninguna regla. Así cada zona del CSS tiene su archivo y el CSS compilado queda idéntico.

## Criterios de aceptación

- [x] `app/globals.css` solo contiene los 14 `@import`, en orden.
- [x] `styles/` tiene los 14 archivos y su unión es idéntica al `globals.css` anterior.
- [x] El CSS que genera `next build` es idéntico byte a byte antes y después.
- [x] Sonar sigue analizando el CSS: `sonar.sources` incluye `apps/web/styles`.
- [x] `TOKENS.md` y `ai-rules/ARCHITECTURE.md` dicen dónde viven ahora los tokens y los estilos.

## Implementación

### Tramos de `apps/web/styles/`

Cada tramo empieza en la línea que abre con su ancla y termina justo antes de la siguiente. Las líneas son las del `globals.css` de `b26ebf4`.

| Archivo | Ancla | Líneas de `globals.css` | Contenido |
| --- | --- | --- | --- |
| `01-tokens.css` | `:root {` | 1–28 | Variables de color, sombras y medidas |
| `02-base.css` | `* {` | 29–73 | Reset, `body`, enlaces, `.sr-only` |
| `03-shell.css` | `.app-shell {` | 74–344 | Sidebar, navegación, topbar, avatar |
| `04-controles.css` | `.button {` | 345–633 | Botones, selects, inputs, alertas, contraseña |
| `05-superficies.css` | `.card {` | 634–665 | Tarjetas y badges |
| `06-pipeline.css` | `.page-actions {` | 666–802 | KPIs y tablero del pipeline |
| `07-tablas.css` | `.data-card {` | 803–928 | Tablas, paginación, estados vacíos |
| `08-acceso.css` | `/* Pantallas de acceso.` | 929–1291 | Acceso, reglas de contraseña, términos |
| `09-usuarios.css` | `.users-page {` | 1292–1438 | Usuarios, invitación, formularios |
| `10-directorio.css` | `.contacts-page,` | 1439–1887 | Contactos, empresas, fichas, importación |
| `11-responsive.css` | `@media (max-width: 1024px) {` | 1888–2129 | Ajustes responsive generales |
| `12-acceso-2026.css` | `/* Acceso 2026` | 2130–2505 | Composición de las pantallas de acceso |
| `13-dialogos-y-ajustes.css` | `/* Modal real para edición administrativa` | 2506–2883 | Diálogo de usuario y responsive final |
| `14-skeleton.css` | `/* Skeletons:` | 2884–2976 | Esqueletos de carga |

### Archivos editados

- `apps/web/app/globals.css`: solo los 14 `@import "../styles/NN-nombre.css"`, con un comentario que pide no reordenarlos. `app/layout.tsx` sigue importando `./globals.css`.
- `sonar-project.properties`: `apps/web/styles` en `sonar.sources`, después de `apps/web/lib`.
- `docs/design/TOKENS.md`: la primera línea dice dónde viven los tokens y los estilos.
- `README.md`: `styles/` en *Estructura* y la regla para estilos nuevos.
- `docs/Sprint 3/README.md`: fila del documento.

## Decisiones

- **Corte por tramos contiguos y no por componente:** el archivo reparte reglas del mismo selector en varios lugares (`.select-control` en controles y en acceso, `.table-search` en el shell y en tablas) y las media queries agrupan reglas de muchos componentes. Reagrupar por componente cambiaría el orden de la cascada. Consolidar reglas repetidas es otra tarea, con revisión visual.
- **Nuevo lugar de la fuente de verdad**, por decisión del usuario: los tokens viven en `styles/01-tokens.css` y el resto en `styles/`. `globals.css` sigue siendo la entrada, así que nada cambia para `layout.tsx`.
- **Ancla 14 `/* Skeletons:`** en lugar de `/* Esqueletos de carga` del plan: la tarea 04 no se hizo con su prompt, sino como *Mejora adicional - Skeletons de carga* (Eduardo, 2026-10-08), y su bloque abre con ese comentario. Los anclas 01 a 13 aparecen una sola vez y en orden, como pedía el plan.
- **`app/(dashboard)/pipeline/pipeline.css` no se toca:** es CSS de la ruta, que se carga solo en el pipeline y sale en su propio archivo compilado. Pasarlo a `styles/` lo volvería global y cambiaría el CSS compilado.
- **Sonar:** antes del corte, `globals.css` tenía 0 bugs, 0 code smells y 0 líneas duplicadas en `ZaithManangon-Dev`. El análisis verá las líneas como nuevas (`git blame` las atribuye a este commit), pero no trae hallazgos nuevos al Quality Gate, y la cobertura no aplica al CSS.
- **Coordinación con CRM-1.** El CSS de ese ticket queda repartido en `styles/`, sin cambios. Los tickets anteriores no llevan bloque fechado: `app/globals.css` sigue siendo la entrada de los estilos y la tabla de tramos dice dónde quedó cada regla.

## Validación

```bash
pnpm --filter @wave/web build       # antes del corte: CSS compilado guardado
node dividir-css.mjs                # 14 anclas únicas y en orden, llaves balanceadas, unión idéntica
pnpm --filter @wave/web build       # después del corte
node comparar-css.mjs comparar      # CSS COMPILADO IDÉNTICO (mismos 2 archivos con el mismo hash)
pnpm lint                           # sin errores
pnpm build                          # sin errores
pnpm --filter @wave/web test        # 241/241 en 69 archivos
```

- `comparar-css.mjs` y `dividir-css.mjs` son los scripts de la tarea 05; se corrieron fuera del repositorio. El único cambio al script de corte es el ancla 14.
- En `pnpm dev`, `/login` carga 576 reglas sin ningún `@import` sin resolver, con reglas de tokens, shell, controles, tablas, usuarios, directorio y esqueletos, y los tokens aplicados. Sin errores en la consola.

## Reubicacion del CSS del pipeline (2026-10-13)

### Implementacion

`pipeline.css` paso de `app/(dashboard)/pipeline/` a `styles/pipeline.css` durante la [reorganizacion de carpetas](Estructura%20de%20carpetas%20de%20apps-web.md). Sigue importado solo por las rutas del pipeline. Los 14 tramos globales y el orden de `app/globals.css` no cambiaron.

## `.page-actions` retirada (2026-10-27)

### Implementación

`.page-actions` salió de `06-pipeline.css` y de `11-responsive.css`: ninguna pantalla la usa. Desde entonces el tramo 06 abre con `.kpi-grid {` y no con `.page-actions {`; la tabla de tramos conserva el ancla del corte original (`b26ebf4`). Por esas reglas, el CSS compilado ya no es idéntico al del corte. Detalle en el bloque *Recorte de código del pipeline* de [CRM-20](20%20-%20Ficha%20de%20Negocio.md).
