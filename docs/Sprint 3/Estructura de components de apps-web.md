# Estructura de components/ de apps/web

**Responsable:** Zaith Manangón · **Estado:** Completo (5/5 criterios). Versión reducida de la tarea 02 de `Tareas Sprint 3/`, pedida por el usuario el 2026-10-12.

## Objetivo

Ordenar `apps/web/components/` en carpetas por tipo, sin cambiar lógica ni textos. Era una carpeta plana que mezclaba piezas de formulario, piezas de listado, el shell y los esqueletos de carga.

## Criterios de aceptación

Los criterios salen de la tarea *02 · Estructura de carpetas de apps/web*, recortados a `components/`.

- [x] `components/` solo tiene carpetas: `ui/`, `form/`, `data/`, `layout/` y `csv-import/`.
- [x] `components/` no depende de `app/`: el shell recibe `logout` por props.
- [x] ESLint rechaza imports desde `@/app/**` en `components/`, `content/` y `lib/`.
- [x] `pnpm lint`, `pnpm build` y las pruebas web en verde, con el mismo número de pruebas que antes, y ningún `vi.mock` con ruta rota.
- [x] Nada cambia a la vista.

## Implementación

### Rutas nuevas en `apps/web/components/`

| Antes (`components/`) | Ahora |
| --- | --- |
| `form-dialog.tsx`, `form-field.tsx`, `phone-field.tsx`, `location-fields.tsx`, `new-password-form.tsx`, `use-field-errors.ts` | `components/form/` |
| `list-header.tsx`, `list-filters.tsx`, `live-search.tsx`, `pagination.tsx`, `tag-list.tsx`, `detail-info.tsx` | `components/data/` |
| `app-shell.tsx`, `section-placeholder.tsx`, `loading-skeletons.tsx` | `components/layout/` |

Las pruebas se movieron con su archivo: 21 archivos con `git mv`. `ui/` y `csv-import/` no cambian. Otros 30 archivos solo cambian imports: páginas de auth, contactos, empresas, usuarios, pipeline, actividades, cotizaciones y reportes, y el layout del dashboard.

### Archivos editados

- `apps/web/components/layout/app-shell.tsx`: prop `logoutAction` en lugar de importar `logout` desde `@/app/(auth)/actions`.
- `apps/web/app/(dashboard)/layout.tsx`: importa `logout` y lo pasa como `logoutAction`.
- `apps/web/components/layout/app-shell.test.tsx`: sin el `vi.mock` de `@/app/(auth)/actions`; pasa `logoutAction` a cada `AppShell`.
- `apps/web/eslint.config.mjs`: `no-restricted-imports` con el patrón `@/app/**` para `components/`, `content/` y `lib/`.
- `README.md`: `components/` y la regla de dependencias en *Estructura*.
- `docs/Calidad/Pruebas del Sprint 1.md` y `docs/Calidad/Pruebas del Sprint 2.md`: rutas de las pruebas movidas.
- `docs/Sprint 3/README.md`: fila del documento.

## Decisiones

- **Solo `components/`:** era la carpeta desordenada. `features/` (sacar de `app/` las server actions y los formularios) queda fuera: tocaría mucho más del módulo pipeline de Eduardo y no era el problema.
- **Clasificación:** `form/` arma formularios; `data/` muestra o filtra datos en listados y fichas (`detail-info.tsx` es el `Info` de las fichas); `layout/` da forma a la página entera (shell, sección vacía y esqueletos de página). `new-password-form.tsx` va a `form/` porque lo comparten dos rutas de `(auth)`. `lib/csv-import.ts` se queda en `lib/`: lo usan las server actions de importar.
- **Mapa y script de la tarea 02, recortados a estos 15 archivos.** Un import entre archivos que quedan en la misma carpeta pasa a `./x`; los demás, a `@/components/<carpeta>/x`.
- **`logout` por props:** el layout ya es dueño de la sesión. Así el shell no importa una ruta y el código de producción cumple la regla sin excepciones.
- **La regla de ESLint no aplica a las pruebas:** `csv-header.test.ts`, `import-form.test.tsx` y `spreadsheet.test.tsx` usan los `fields.ts` reales de `contactos/importar` y `empresas/importar` como datos, para probar el importador con los campos que de verdad recibe.
- **Tickets anteriores sin bloque fechado:** 11 tickets nombran rutas viejas y la tabla de este documento dice dónde quedó cada archivo, como decidió la tarea 05 para el CSS. Las notas de `docs/Calidad/` sí se corrigen: son catálogos de pruebas y sus rutas se usan para correrlas.
- **Coordinación con CRM-5, CRM-7, CRM-14, CRM-15, CRM-19 del Sprint 3 y *Skeletons de carga* (Eduardo).** Se mueven `app-shell.tsx`, `section-placeholder.tsx` y `loading-skeletons.tsx`, y en sus páginas y en el módulo pipeline cambian solo imports. Autorizado por el usuario el 2026-10-12.

## Validación

```bash
pnpm lint                      # sin errores
pnpm build                     # sin errores; las 17 rutas conservan su URL
pnpm --filter @wave/web test   # 241/241 en 69 archivos, igual que antes de mover
```

- `git log --stat -M` muestra los 21 archivos como renombrados.
- Los 42 `vi.mock` internos apuntan a archivos que existen.
- La regla marca un archivo temporal en `components/ui/` y otro en `lib/` que importaban `@/app/(auth)/actions`. Se borraron después.
- Revisión con `pnpm dev` y el usuario de desarrollo del seed: listado y ficha de contacto, `/cotizaciones` (`SectionPlaceholder`) y *Cerrar sesión*, que lleva a `/login` y cierra la sesión. Sin errores en la consola ni en el servidor.

## Reubicacion adicional (2026-10-13)

### Implementacion

`components/csv-import/` ahora vive en `features/importacion-csv/` y `components/form/new-password-form.tsx` vive en `features/auth/`. El mapa completo esta en [Estructura de carpetas de apps/web](Estructura%20de%20carpetas%20de%20apps-web.md). La tabla anterior describe el estado al cerrar esta primera reorganizacion.
