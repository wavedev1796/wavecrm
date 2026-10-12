# Esqueletos de carga

**Responsable:** Zaith Manangón · **Estado:** Completo (5/5 criterios). Tarea 04 de `Tareas Sprint 3/`, pedida por el usuario el 2026-10-12. Completa la [mejora de Eduardo García del 2026-10-08](../Sprint%202/Mejora%20adicional%20-%20Skeletons%20de%20carga.md).

## Objetivo

Mostrar un esqueleto con la forma del contenido mientras cargan los listados, las fichas y usuarios, también al buscar, filtrar o paginar. Así la pantalla no se queda quieta sin señal mientras el API responde.

## Criterios de aceptación

- [x] Contactos, empresas, sus fichas y usuarios muestran un esqueleto al cargar, y los listados también al buscar, filtrar o paginar.
- [x] Los esqueletos de listado no aparecen en las rutas hijas (`[id]`, `importar`).
- [x] Al llegar los datos, columnas, alturas y anchos no saltan.
- [x] Solo se anuncia "Cargando …" al lector de pantalla, y la animación se desactiva con `prefers-reduced-motion`.
- [x] `TOKENS.md` documenta el esqueleto y su excepción de movimiento.

## Implementación

### Punto de partida

La mejora del 2026-10-08 ya daba `loading.tsx` a listados, fichas, importación y usuarios, y desactivaba el brillo con `prefers-reduced-motion`. Faltaba el esqueleto al buscar, filtrar o paginar; el esqueleto del listado podía aparecer al entrar a una ficha; la tabla era una cuadrícula propia de 5 filas; todos anunciaban «Cargando contenido», escrito a mano; y `TOKENS.md` no lo documentaba.

### Listados

- `apps/web/app/(dashboard)/contactos/(listado)/page.tsx` y `empresas/(listado)/page.tsx`: la página y su `loading.tsx` pasan al grupo de rutas `(listado)`. La URL no cambia. La página ya no pide datos: arma la consulta y deja el resumen y la tabla a dos `<Suspense key={query}>`.
- `contactos/(listado)/contacts-results.tsx` y `empresas/(listado)/companies-results.tsx`: `ContactsSummary`/`ContactsResults` y `CompaniesSummary`/`CompaniesResults`, componentes `async` con una consulta compartida por `cache` de React. La fila de la tabla sale de la página y se muda aquí.
- `apps/web/components/data/list-header.tsx`: `summary` pasa de `string` a `React.ReactNode`, para recibir el `Suspense`.

### Esqueletos

- `apps/web/components/layout/loading-skeletons.tsx`: todos reciben `label`. `TableSkeleton` (nuevo) pinta la `Table` real con los encabezados reales, 10 filas, avatar opcional y la paginación. `ListPageSkeleton`, `DetailPageSkeleton` y `UsersPageSkeleton` usan el marcado y las clases del contenido real. `ImportPageSkeleton` (nuevo) reúne los dos `importar/loading.tsx`, que eran idénticos.
- `loading.tsx` de `contactos/(listado)`, `contactos/[id]`, `contactos/importar`, `empresas/(listado)`, `empresas/[id]`, `empresas/importar`, `pipeline/[id]` y `usuarios`: pasan su texto desde `content/`.
- `apps/web/content/contactos.ts`, `empresas.ts`, `usuarios.ts`, `importacion.ts` y `pipeline.ts` (`NEGOCIO`): claves `cargando` («Cargando contactos…», «Cargando contacto…», etc.).
- `apps/web/styles/14-skeleton.css`: colores con tokens (`--wave-line`, `--wave-line-strong`), bloque de texto `.skeleton-text`, filtros, avatar de 34 px, botones de paginación y `.data-card-alert`. Salen las clases de la cuadrícula anterior.
- `docs/design/TOKENS.md`: excepción de movimiento y estado *Cargando*.

### Pruebas

- `apps/web/components/layout/loading-skeletons.test.tsx`: reescrita para los esqueletos nuevos.
- `apps/web/app/(dashboard)/cargando.test.tsx`: cada `loading.tsx` anuncia solo su texto.
- `contactos/(listado)/contacts-results.test.tsx` y `empresas/(listado)/companies-results.test.tsx`: lo que antes probaba la página (filas, enlaces, paginación, resumen, vacío y error).
- `contactos/(listado)/page.test.tsx` y `empresas/(listado)/page.test.tsx`: la consulta, *Importar*, la acción de alta, el buscador y el aviso de empresa creada.

## Decisiones

Las cinco primeras vienen de la tarea 04 (decisiones de Zaith):

- **Grupo de rutas `(listado)`:** un `loading.tsx` en `contactos/` envuelve también a `[id]` e `importar`. Al entrar a una ficha desde otra sección se veía primero el esqueleto del listado.
- **`Suspense` con `key`:** la navegación de Next es una transición, y React deja visible el contenido anterior en lugar del fallback. La `key` con la consulta crea un límite nuevo en cada búsqueda.
- **Los componentes `async` se prueban aparte**, con `render(await Componente(props))`: dentro de `<Suspense>` se quedan en el fallback en jsdom. La prueba de la página los mockea.
- **Movimiento:** se conserva el brillo de 1,5 s de la mejora en lugar del 1,4 s de la tarea, para no cambiar algo que ya estaba a la vista. Está documentado como excepción en `TOKENS.md`.
- **Único cambio visible fuera de los esqueletos:** el aviso «No pudimos cargar…» de los listados pasa a mostrarse dentro de la tarjeta (`.data-card-alert`), en lugar de la tabla, porque ahora depende de la consulta.
- **Medidas por marcado real, no por números:** los bloques de texto van dentro de `<td>`, `<strong>`, `<small>`, `<h2>` y `<p>` reales y miden `0.75em`, más bajos que su alto de línea. Así la fila, la cabecera y el perfil miden lo mismo con texto o sin él, también si cambia la tipografía. `.skeleton.skeleton-text` lleva dos clases para ganarle a reglas como `.user-summary span`.
- **Anchos de columna:** la tabla real es automática y reparte el ancho según el contenido; ya cambia entre una página de resultados y otra. El esqueleto usa los mismos encabezados y bloques de ancho medio; los altos no cambian.
- **Fichas:** un mismo esqueleto sirve a contacto, empresa y negocio. Coincide hasta el perfil; las tarjetas de abajo dependen de los datos de cada registro (contactos relacionados, historial, largo del formulario).
- **Coordinación con CRM-14, CRM-15 y *Skeletons de carga* (Eduardo).** Se mueven las páginas de listado, se reescriben sus pruebas y los esqueletos, y se cambian los `loading.tsx` de fichas, importación y usuarios. Autorizado por el usuario el 2026-10-12.
- **Coordinación con CRM-16 y CRM-19.** `list-header.tsx` (resumen como nodo) y `content/` (claves `cargando`).
- **Coordinación con CRM-20.** `pipeline/[id]/loading.tsx` pasa su texto a `DetailPageSkeleton`; `NEGOCIO.cargando` es nuevo.

## Validación

```bash
pnpm lint                    # sin errores
pnpm build                   # sin errores; /contactos, /contactos/[id], /contactos/importar y las de empresas conservan su URL
pnpm test:coverage:web       # 258/258 en 72 archivos; los archivos nuevos y tocados, al 100 % de líneas
```

### Revisión en el navegador (`pnpm dev`, 1280 × 900)

Se pintó cada esqueleto en una ruta temporal (borrada después) y se midió contra la página real con datos:

| Medida (px) | Contactos | Empresas | Usuarios | Ficha de contacto |
| --- | --- | --- | --- | --- |
| Cabecera / resumen | 111,5 = 111,5 | 111,5 = 111,5 | 84,7 = 84,7 | perfil en 138, alto 119 = real |
| Filtros / barra | 78 = 78 | 78 = 78 | 73 = 73 | — |
| Encabezado de tabla | 42,6 = 42,6 | 42,6 = 42,6 | 42,6 = 42,6 | — |
| Fila | 64,5 = 64,5 | 64,5 = 64,5 | 64,5 = 64,5 | — |
| Paginación | 62 = 62 | 62 = 62 | 62 = 62 | — |

- La única fila distinta fue la de una empresa sin razón social (53 px, una sola línea): depende del dato.
- Al buscar «Ana», el resumen y la tabla pasaron al esqueleto durante unos 0,8 s y volvieron con «0 contactos registrados». La cabecera y los filtros siguieron siendo los mismos nodos, y el buscador conservó el foco y lo escrito.
- Navegando con el router: `/pipeline` → `/contactos` anuncia «Cargando contactos…»; `/pipeline` → `/contactos/[id]` y `/contactos` → `/contactos/[id]`, solo «Cargando contacto…»; `/contactos` → `/contactos/importar`, ningún esqueleto de listado. Lo mismo en empresas. `/usuarios` anuncia «Cargando usuarios…».
- La regla `@media (prefers-reduced-motion: reduce)` quita la animación de `.skeleton::after`. Las pruebas comprueban que el directorio esqueleto no expone cabecera, título ni tabla, y que hay un solo `status`.
- Con el panel del navegador oculto, Chrome no ejecuta el `requestAnimationFrame` con el que React revela el contenido que llega por streaming: la página se queda en el esqueleto hasta volver a mostrarse. Le pasa a cualquier ruta con `loading.tsx`, también al pipeline, y no a una pestaña a la vista. Para medir se forzó el revelado a mano.

## Pendientes

- `app/(dashboard)/pipeline/loading.tsx` (CRM-19, Eduardo) sigue con sus textos escritos a mano («Cargando pipeline»). Pasarlos a `content/` toca su módulo y necesita su OK.
- Esqueletos propios por ficha, si se quiere que tampoco cambien de alto las tarjetas de abajo.
