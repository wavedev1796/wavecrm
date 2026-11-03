# CRM-26 — Notas y menciones

**Responsable:** Zaith Manangón · **Estado:** Completo (4/4 criterios). El usuario autorizó tocar las fichas de negocio y contacto de Eduardo (`pipeline/[id]`, `contactos/[id]`, `deal-timeline.tsx`) el 2026-11-02.

## Objetivo

Registrar notas en un negocio o un contacto, con menciones a miembros del equipo, y mostrarlas en el historial de la ficha. La revisión de develop `bc28c5d` (2026-10-31) encontró que el modelo `Note` existía sin módulo operativo y sin aviso por mención.

## Criterios de aceptación

- [x] Dado registro autorizado, cuando se crea una nota, entonces queda vinculada con autor y fecha y se muestra sin ejecutar HTML o scripts.
- [x] Dada mención a miembro activo, cuando se guarda, entonces se notifica una vez con enlace accesible; una mención no otorga nuevos permisos.
- [x] Dada edición o eliminación de nota, cuando se confirma, entonces se aplica la política de autor/admin y queda traza; un fallo conserva el texto para reintentar.
- [x] Dado usuario no autorizado o nota vinculada a otro registro, cuando llama al API, entonces se rechaza sin exponer su contenido.

## Implementación

### API

- `apps/api/src/modules/notes/` (nuevo): `notes.module.ts`, `notes.controller.ts`, `notes.service.ts` y `notes.dto.ts`. Registrado en `apps/api/src/app.module.ts`.
- `apps/api/src/modules/mailer/mailer.service.ts`: `sendMention(recipient, author, record, path)`.
- `apps/api/src/modules/timeline/timeline.service.ts`: cada nota trae `mentions`, `editedAt` y `canEdit` (quien mira es su autor o ADMIN).
- `packages/database/prisma/schema.prisma`: `Note.editedAt` y modelo `NoteMention` (`noteId` + `userId`, `notifiedAt`), con relación `User.noteMentions`.
- Migración `packages/database/prisma/migrations/20261102130000_note_mentions/migration.sql`.

### Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/deals/:id/notes` | Nota en un negocio. Cuerpo `{ content, mentionIds? }`. |
| `POST` | `/contacts/:id/notes` | Nota en un contacto. Mismo cuerpo. |
| `PATCH` | `/notes/:id` | Editar texto o menciones (autor o ADMIN). |
| `DELETE` | `/notes/:id` | Eliminar (autor o ADMIN). `204`. |

`content`: de 1 a 5000 caracteres, limpio con `cleanText` (conserva saltos de línea). `mentionIds`: hasta 20 ids de miembros activos. La respuesta trae la nota con `author` y `mentions` (`{ id, name }`). Errores: `400` (texto o mención inválidos), `403` (en alcance pero no es autor ni ADMIN), `404` (registro o nota fuera de alcance, o inexistente).

### Web

- `apps/web/features/timeline/note-actions.ts` (nuevo): acciones `createNote`, `updateNote` y `deleteNote`. Validan el texto antes de llamar al API, devuelven lo escrito si algo falla y revalidan `/pipeline` y `/contactos`.
- `apps/web/features/timeline/note-form.tsx` (nuevo): `NoteForm` (texto y casillas *Mencionar a*) y `NoteControls` (*Editar* en el mismo evento, *Eliminar* con confirmación).
- `apps/web/features/timeline/{types.ts,entries.ts,timeline-list.tsx}`: la nota muestra «Editada» y «Menciona a …» en su detalle; si es editable, la lista pinta sus controles.
- `apps/web/features/pipeline/deal-timeline.tsx` y `app/(dashboard)/pipeline/[id]/page.tsx`: formulario de nota bajo el de actividad. Los miembros salen de `options.users`, que la ficha ya cargaba.
- `apps/web/app/(dashboard)/contactos/[id]/page.tsx`: pide `GET /pipeline/owners` en paralelo y muestra el formulario en el *Historial*.
- `apps/web/content/timeline.ts`: textos de `notas`, `editada` y `menciona`.
- `apps/web/styles/10-directorio.css`: `.note-form`, `.note-mentions` y `.note-actions`, en el tramo global del historial (`pipeline.css` solo carga bajo `/pipeline`). Las casillas siguen la piel del `fieldset` de requisitos de etapa: borde `--wave-line`, radio 10 px, `accent-color` `--wave-blue` y 44 px de alto táctil.

## Decisiones

- **Aviso por correo (decidido por el usuario).** Se reutiliza `MailerService`, como en los recordatorios. No hay bandeja en la app.
- **Una sola vez por mención.** `NoteMention.notifiedAt` se reclama con `updateMany … notifiedAt: null` antes de enviar, así dos guardados seguidos no duplican el correo. Editar con las mismas menciones no vuelve a avisar; una mención nueva avisa solo a esa persona. Si el envío falla, la mención se libera: la nota queda guardada y el aviso se reintenta la próxima vez que se edite. Quitar una mención borra su fila, y volver a ponerla avisa de nuevo.
- **La mención no da permisos.** El correo trae autor, tipo y título del registro y el enlace a la ficha, sin el texto de la nota: quien recibe el aviso puede no tener alcance sobre el historial. Las fichas siguen visibles para el equipo; el historial y las notas, no (CRM-25).
- **Selector de miembros (decidido por el usuario).** Casillas con los usuarios activos de `GET /pipeline/owners`, en lugar de interpretar `@nombre` en el texto: se usa con teclado y no falla con nombres de dos palabras. El autor no puede mencionarse a sí mismo (se descarta en silencio) y los ids repetidos cuentan una vez.
- **Política (decidida por el usuario).** Escribir una nota sigue el alcance del historial: ADMIN, o el responsable del negocio o contacto. Editar y eliminar, además, solo el autor o un ADMIN. Fuera del alcance, `404` igual que si la nota no existiera, sin revelar su contenido; en el alcance pero sin ser autor, `403`.
- **Borrado real con traza.** Eliminar borra la fila (y sus menciones, en cascada) y deja en `AuditLog` (`entityType: "Note"`, `DELETED`) el texto, el autor, el registro y las menciones. Cada edición deja `UPDATED` con el texto y las menciones anteriores. El historial no muestra esos eventos (solo los de `Deal`).
- **Texto plano.** La nota se guarda tal cual la escribió la persona (sin quitar etiquetas) y React la pinta como texto, así que `<script>` o `<img onerror>` se ven y no se ejecutan. El correo escapa el HTML.
- **Sin control de versión.** Si dos personas editan la misma nota a la vez, gana la última (marcado `ponytail:`). Solo el autor y los ADMIN pueden editar, así que el choque es poco probable.
- **Notas en un negocio rechazado.** Se permiten: a diferencia de una actividad, una nota no es trabajo pendiente.
- **Coordinación con CRM-25.** `TimelineService.page()` recibe el usuario para calcular `canEdit`, y la nota del timeline crece con `mentions`, `editedAt` y `canEdit`.

## Validación

- 8 pruebas unitarias nuevas en `apps/api/test/unitarias/notes/notes.service.test.cjs`: autor y menciones (sin repetidos ni autor), texto con `<script>` guardado tal cual, correo con enlace y sin el texto, edición sin re-aviso, mención nueva que avisa solo a esa persona, mención quitada, miembros inactivos o inexistentes (`400`), fallo de correo que deja la mención pendiente, `404` fuera de alcance, `403` a quien no es autor, traza de edición y de borrado, y DTO (limpieza, 1–5000, 20 menciones).
- `apps/api/test/unitarias/mailer/mailer.service.test.cjs`: el aviso de mención enlaza a la ficha y escapa el HTML. `timeline.service.test.cjs`: la nota trae `mentions`, `editedAt` y `canEdit`, que es `false` para un VENDEDOR que no la escribió.
- Integración nueva en `apps/api/test/integracion/notes.http.test.cjs` contra `pruebas`: `401` sin sesión, nota con autor y fecha y un aviso por miembro, edición sin re-aviso, nota en el timeline, `404` al mencionado sin alcance, `400` por mención inactiva o texto vacío, `404` sin exponer el contenido, `403` y borrado de ADMIN con traza.
- Web: `note-actions.test.ts`, `note-form.test.tsx` (el texto y las casillas se conservan tras un fallo, error en el campo, editar y cancelar, confirmación al eliminar), `entries.test.ts`, `timeline-list.test.tsx` y `deal-timeline.test.tsx`.
- Resultados: 268 pruebas unitarias del API, 365 de la web y 65 de integración contra `pruebas` aprobadas; `pnpm lint` aprobado. `pnpm build` compiló database, shared, API y web (el `prisma generate` del paso de database se corrió aparte porque los servidores de desarrollo bloqueaban el motor en Windows); tras el arreglo de `NoteControls`, `tsc --noEmit` de la web.
- Navegador (`/pipeline/[id]` y `/contactos/[id]` contra `development`, como ADMIN, sin marcar menciones porque esa base tiene SMTP real): guardar vacío marca «Escribe la nota.» en el campo; una nota con `<b>` y `<script>` aparece como texto, sin elementos HTML en el historial; editar muestra «Editada» y el texto nuevo; eliminar pide «¿Eliminar esta nota? Quedará registrado quién la eliminó.» y la quita. La ficha de contacto muestra el formulario con los tres miembros activos. La nota de prueba se eliminó (queda su traza en `AuditLog`).
- La verificación encontró que, al editar, el historial no se refrescaba hasta recargar: `NoteControls` envolvía la acción de servidor y cerraba el editor dentro de ella. Ahora pasa `updateNote` directa a `useActionState` y cierra el editor al recibir el estado guardado. También se ocultaba tarde el error del texto: los dos formularios usan `useFieldErrors` y la acción devuelve `fieldErrors`.
- La migración `20261102130000_note_mentions` está aplicada en `pruebas` y en `development` (2026-11-02, con OK del usuario).

### Incidente con `pruebas` (2026-11-02)

Al validar la migración a mano se pasó la URL de `pruebas` como `--shadow-database-url` a `prisma migrate diff`, y Prisma reinició esa base. Con OK del usuario se restauró desde `development` (`reset_from_parent` en Neon, el procedimiento de `docs/Infraestructura/Neon - base de datos compartida.md`) y se aplicó solo esta migración. Ninguna rama real de Neon debe usarse como *shadow database*.

### Cómo probarlo a mano

1. Con la responsable de un negocio, escribir una nota con `<b>hola</b>` y mencionar a otro miembro: el historial la muestra como texto con «Menciona a …», y el mencionado recibe un correo con el enlace (en desarrollo sin SMTP, el enlace sale en la consola del API).
2. Editarla sin cambiar las menciones: aparece «Editada» y no llega otro correo.
3. Con otro VENDEDOR, abrir el enlace: la ficha carga, pero el historial dice «No tienes acceso al historial de este registro.».
4. Con un ADMIN, eliminar la nota: pide confirmación y desaparece del historial; `AuditLog` guarda la copia.

## Pendientes

- Producción recibe la migración `20261102130000_note_mentions` en el próximo despliegue.
- Avisar a Eduardo: migración, `POST /deals|contacts/:id/notes`, `PATCH|DELETE /notes/:id`, cambios en `deal-timeline.tsx` y en las fichas de negocio y contacto, y `sendMention` en el `MailerService` (los dobles de prueba deben implementarlo).
