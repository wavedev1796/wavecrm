# Revisión del equipo (2026-10-31)

**Responsable:** Zaith Manangón · **Estado:** Parcial (7/16 criterios). Bloque 1 (P0, P2, P5, P7, P10, P15) hecho el 2026-11-11 y bloque 2 (P14) el 2026-11-13. Diseño aprobado por el usuario el 2026-11-11, con OK para tocar el módulo de pipeline de Eduardo (CRM-17 a CRM-19) y sumar iconos a sus formularios de contactos y empresas. P13 (sus fichas) sigue necesitando OK propio.

## Objetivo

Corregir y ampliar el flujo comercial con los puntos que sacó el equipo en la reunión del 31 de octubre: montos con formato local, pagos por abonos, comprobación del pago antes de ganar, motivos de pérdida, rechazo reversible, historial de cambios por campo, viabilidad del negocio, alertas por días sin actividad y control por roles.

El pedido no trae criterios escritos: salen de los puntos de la reunión (mensajes del 31-10, de 12:43 a 14:12) y de las respuestas del usuario del 2026-11-11, que además sumó P14 y P15.

## Criterios de aceptación

- [x] **P0. Monto en formato de Ecuador.** El punto de miles es opcional (`8000` y `8.000` son lo mismo) y solo la coma separa los centavos (`8.000,50`). La regla es la misma en todos los campos de dinero.
- [ ] **P1. Días sin actividad configurables.** Un ADMIN define por etapa cuántos días sin actividad marcan un negocio *En riesgo*. La tarjeta del tablero y la ficha lo muestran.
- [x] **P2. Rechazo reversible.** El botón *Rechazar* pasa a llamarse *Enmendar*, con icono. Deshacerlo devuelve el negocio a la etapa donde estaba, con todos sus datos.
- [ ] **P3. Historial por campo (estilo Frappe).** La ficha muestra cada cambio del negocio como «campo: antes → después», con autor y fecha.
- [ ] **P4. Viabilidad del vendedor.** La tarjeta *Calificación* registra si el negocio es viable y la evidencia que lo respalda. Sin esa evidencia no se puede ganar.
- [x] **P5. Barra de avance.** El selector de etapa deshabilitado del formulario se reemplaza por una barra de porcentaje con el color de cada etapa.
- [ ] **P6. Abonos.** La ficha registra pagos con monto, fecha y nota, sin archivo adjunto, y muestra el total abonado y el saldo pendiente.
- [x] **P7. Observación en cada movimiento.** Al mover una tarjeta a cualquier estado del tablero (otra etapa, Ganado, Perdido, Rechazado o Abierto al reversar), el modal ofrece un campo opcional *Observaciones* que se guarda como nota del negocio. La ficha ya admitía notas en todos los estados.
- [ ] **P8. Comprobación del pago.** El último paso para ganar pregunta «¿Se comprobó el pago?» (Sí/No). Con *No* el negocio no se gana.
- [ ] **P9. Motivo de pérdida.** Al perder se elige el motivo de una lista que empieza por los más probables, entre ellos el nuevo *No realizó el pago*.
- [x] **P10. Reversar.** *Reabrir* pasa a llamarse *Reversar* en el tablero, la ficha y la papelera.
- [ ] **P11. Estados por rol.** Las acciones de estado respetan la tabla de roles de *Decisiones*, en el API (`403`) y en la web (botones ocultos).
- [ ] **P12. Notas por correo.** Cada nota nueva avisa por correo al responsable del negocio, además de a los mencionados.
- [ ] **P13. Productos por cliente.** La ficha del contacto y la de la empresa listan los productos de sus negocios ganados.
- [x] **P14. Actividades del negocio en la agenda.** La ficha del negocio registra actividades con el mismo formulario de la agenda (responsable, vencimiento con hora, recordatorio por correo), ya vinculadas al negocio. Desde la agenda se abre el negocio, y desde el negocio, su agenda filtrada.
- [x] **P15. Iconos en los formularios.** Cada campo de cada formulario lleva un icono antes de su etiqueta, como el formulario *Registrar actividad* de la agenda.

## Implementación

### Bloque 1 (2026-11-11): P0, P2, P5, P7, P10, P15

**P0. Monto**

- `packages/shared/src/amount.ts` (nuevo): `parseAmount()` y `formatAmount()`. Exportados en `packages/shared/src/index.ts`.
- `apps/web/features/pipeline/deal-validation.ts`: `isAmount()` y la cantidad de los productos usan `parseAmount()`. Se quitó `decimal()`.
- `apps/web/features/pipeline/actions.ts`: valor, precio, cantidad y presupuesto viajan con `parseAmount()`.
- `apps/web/features/pipeline/item-totals.ts`: un texto se lee en formato de Ecuador y un número es dato del API.
- Formularios que se llenan con `formatAmount()`: `deal-form.tsx` (valor y placeholder `0,00`), `deal-items.tsx` (precio y cantidad) y `deal-qualification.tsx` (presupuesto). `deal-quotes.tsx` convierte a número las líneas de la propuesta.
- `apps/web/content/pipeline.ts`: mensajes de monto, precio, cantidad y presupuesto.

**P2 y P10. Enmendar y Reversar**

- Textos en `apps/web/content/pipeline.ts`: *Enmendar* y *Enmendar negocio*; *Reversar*, *Reversar negocio* y *Reversar {negocio}*; «Reversa el negocio…» y la ayuda de la papelera.
- Iconos: `Eraser` (Enmendar) y `Undo2` (Reversar) en `features/pipeline/deal-actions.tsx` y `features/pipeline/rejected-trash.tsx`.
- Los mensajes del API pasan a «Reversa el negocio…» y «Solo un administrador puede reversar…»: `apps/api/src/modules/pipeline/pipeline.service.ts` y `apps/api/src/modules/activities/activities.service.ts`.

**P5. Barra de avance**

- `apps/web/features/pipeline/stage-progress.tsx` (nuevo).
- Se usa en `features/pipeline/deal-form.tsx`, al editar y en lugar del selector deshabilitado, y en la cabecera de `app/(dashboard)/pipeline/[id]/page.tsx`.
- Estilos en `apps/web/styles/pipeline.css` y textos en `NEGOCIO.avance`.

**P7. Observación en cada movimiento**

- `apps/web/features/pipeline/transition-dialog.tsx`: el modal ya no mueve directo al abrir. Siempre muestra el formulario: si no falta nada, solo *Observaciones* y *Guardar y continuar*.
- `completeTransitionAction` (`features/pipeline/actions.ts`): valida que la observación tenga hasta 5000 caracteres antes de mover. Después de mover la publica con `POST /deals/:id/notes`. Si la nota falla, devuelve `warning` sin deshacer el movimiento.
- Borrados, porque quedaron sin uso: `moveTransition()` de `features/pipeline/transition-preview.ts` y el `POST` de `app/api/pipeline/deals/[id]/transition/route.ts`. El `GET` de la vista previa se queda.

**P15. Iconos**

- `apps/web/components/form/field-icon.tsx` (nuevo): `FIELD_ICONS` y `FieldIcon`.
- `apps/web/components/form/form-field.tsx`: prop `icon`.
- Estilos `.field-icon` y `.field-label` en `apps/web/styles/09-usuarios.css`. Documentados en `docs/design/TOKENS.md`.
- Formularios con icono:
  - Acceso: `features/auth/login/login-form.tsx`, `features/auth/new-password-form.tsx` y `features/auth/recuperar-contrasena/forgot-password-form.tsx`.
  - Contactos y empresas: `features/contactos/contact-form.tsx`, `features/contactos/company-field.tsx` y `features/empresas/company-form.tsx`.
  - Compartidos: `components/form/phone-field.tsx` y `components/form/location-fields.tsx`.
  - Importación: `features/importacion-csv/import-form.tsx`.
  - Usuarios: `features/usuarios/invite-user-form.tsx` y `features/usuarios/edit-user-dialog.tsx`.
  - Pipeline: `features/pipeline/deal-form.tsx`, `deal-qualification.tsx`, `deal-quotes.tsx`, `deal-items.tsx` (encabezados de columna), `activity-actions.tsx`, `pipeline-settings.tsx` y `transition-dialog.tsx`.
  - Notas: `features/timeline/note-form.tsx`.

**Pruebas**

- Nuevas: `apps/web/features/pipeline/amount.test.ts`.
- Ajustadas:
  - Monto: `actions.test.ts` (formato de Ecuador, observación como nota) e `item-totals.test.ts`.
  - Barra de avance: `pipeline-board.test.tsx` y `app/(dashboard)/pipeline/[id]/page.test.tsx`.
  - Confirmación del modal: `transition-dialog.test.tsx` y `deal-actions.test.tsx`.
  - Textos Enmendar y Reversar: `rejected-trash.test.tsx`, `deal-items.test.tsx`, `app/(dashboard)/pipeline/papelera/page.test.tsx` y el E2E `test/e2e/pipeline.spec.ts`.

### Bloque 2 (2026-11-13): P14

**API**

- `apps/api/src/modules/pipeline/pipeline.dto.ts`: `CreateDealActivityDto` suma `assigneeId` y `reminderAt`.
- `apps/api/src/modules/pipeline/pipeline.service.ts`: `createActivity` toma el responsable (por defecto, quien registra), exige que sea un usuario activo, rechaza el recordatorio en una actividad ya realizada y aplica `assertReminder()`.
- `apps/api/src/modules/activities/activities.service.ts`: la regla del recordatorio sale a `assertReminder()` exportada, para que la agenda y el negocio usen la misma. El listado filtra por `dealId`.
- `apps/api/src/modules/activities/activities.dto.ts`: `ListActivitiesDto` suma `dealId`.

**Web**

- `apps/web/features/actividades/activity-dialog.tsx` (nuevo): el diálogo *Registrar actividad* / *Editar actividad* y sus campos con `Field` e iconos. Lo usan la agenda y la ficha.
- `apps/web/features/actividades/dates.ts` (nuevo): `ecuadorIso()` e `inputDate()`, compartidas por las acciones de la agenda y del negocio.
- `apps/web/features/actividades/agenda.tsx`: el alta y la edición usan el diálogo compartido. El negocio de cada actividad es un enlace a su ficha, y la prop `dealFilter` muestra el filtro activo con su botón para quitarlo.
- `apps/web/features/actividades/actions.ts`: usa `ecuadorIso()` de `dates.ts`.
- `apps/web/app/(dashboard)/actividades/page.tsx`: lee `?dealId=` y lo pasa al API y a la agenda.
- `apps/web/features/pipeline/activity-actions.tsx`: `DealActivity` reemplaza al formulario corto. Botón *Registrar actividad* (oculto en un rechazado), enlace *Ver en la agenda* y el diálogo compartido con la casilla *Ya se realizó*.
- `apps/web/features/pipeline/actions.ts`: `createActivityAction(dealId, form)` valida como la agenda (asunto, tipo, fechas, recordatorio, descripción) y devuelve los errores por campo. Revalida también `/actividades`.
- `apps/web/features/pipeline/deal-timeline.tsx`: usa `DealActivity`.
- `apps/web/features/pipeline/types.ts`: se borraron `ActivityValues`, `ActivityFormState` y `emptyActivity`, que quedaron sin uso.
- `apps/web/content/actividades.ts`: textos del formulario (`formulario`), *Ver en la agenda* y el filtro por negocio.
- Estilos: `.activities-deal-filter` y la casilla *Ya se realizó* en `apps/web/styles/10-directorio.css`; `.deal-activity` en `apps/web/styles/pipeline.css`. Se borró `.activity-field-label`, que reemplaza `.field-label`.

**Pruebas**

- API: `pipeline.service.test.cjs` (responsable y recordatorio de la actividad del negocio) y `activities.service.test.cjs` (filtro por negocio).
- Web: `deal-timeline.test.tsx` (reescrita), `agenda.test.tsx` (enlace al negocio y quitar el filtro), `actions.test.ts` (validación de la actividad) y `app/(dashboard)/pipeline/[id]/page.test.tsx`.
- E2E: `test/e2e/pipeline.spec.ts` registra la actividad desde el diálogo y comprueba el enlace a la agenda.

## Decisiones

### Respuestas del usuario (2026-11-11)

- **Monto:** el punto de miles es opcional (`8000` = `8.000`) y la coma es la única que marca los centavos.
- **Pagos:** abonos con monto, fecha y nota, sin captura. «Nada de comprobante aún» significa que no se adjunta archivo.
- **Enmendar:** se refiere a *Rechazar* del tablero.
- **Tiempos configurables:** días sin actividad por etapa.
- **Actividades (P14) e iconos (P15):** pedidos del usuario el 2026-11-11, con la foto del formulario *Registrar actividad* como modelo.

### P0. Monto

- Una función `parseAmount()` en `@wave/shared` convierte el texto que escribe la persona en el número que se envía al API. `isAmount()` de la web pasa a usarla.
- Formato válido: `^\d{1,3}(\.\d{3})*(,\d{1,2})?$` (con puntos de miles) o `^\d+(,\d{1,2})?$` (sin ellos), con 12 dígitos enteros como máximo (`Decimal(14,2)`).
  - Válidos: `8000`, `8.000`, `8000,5`, `8.000,50`, `1.250.000,99`.
  - Inválidos: `8.45`, `520.25`, `80.00`, `8,452` y `8.0000`. Hoy `520.25` se acepta: con la regla nueva se rechaza, porque el punto ya no marca centavos.
- Mensaje de error: «Usa la coma para los centavos, por ejemplo 8.000,50. El punto solo separa miles».
- Al editar, el campo se llena en el mismo formato (`8.452,00`), para que la persona no vea dos estilos distintos.
- El API no cambia: recibe JSON con el número normalizado (`8452.00`) y revalida el rango y los decimales. El formato humano vive solo en la web.
- Aplica a todos los campos de dinero: valor del negocio, precio unitario, presupuesto y abonos. *Mi decisión:* la cantidad de los productos usa la misma convención (coma decimal, máximo 999.999), para no mezclar dos estilos en la misma tabla.

### P1. Días sin actividad

- `Stage.staleDays Int?` (vacío = sin alerta). Lo edita un ADMIN en *Configurar pipeline*, junto a la probabilidad y los requisitos.
- Un negocio abierto está *En riesgo* si su última actividad completada, o su fecha de creación, tiene más de `staleDays` días (día de Ecuador). Se calcula al leer el tablero; no se guarda.
- *Mi decisión:* solo se avisa (insignia en la tarjeta y en la ficha). No se marca como perdido de forma automática, porque perder exige un motivo que solo da una persona.

### P2 y P10. Enmendar y Reversar

- Un rechazado ya conserva su `stageId`. *Reversar*, en la papelera o en la ficha, ya lo devuelve a esa etapa (lo comprobó la revisión del 2026-11-11). Lo que cambia son los nombres y los iconos: *Enmendar* (`Eraser`) envía a la papelera y *Reversar* (`Undo2`) lo deshace. El nombre del estado sigue siendo *Rechazado*.
- *Mi decisión:* los mensajes del API que decían «Reabre el negocio…» pasan a «Reversa el negocio…», para que la persona no lea un verbo en el botón y otro en el error.
- Textos en `content/pipeline.ts`: `rechazar` → «Enmendar», `reabrir` → «Reversar», con su icono de `lucide-react`. Los códigos (`REJECTED`, `/reopen`) no cambian, para no romper el API ni las pruebas de Eduardo.

### P3. Historial por campo

- `AuditLog.changes` ya guarda el antes y el después de cada edición. Se agrega a `GET /deals/:id/timeline` una entrada `FIELD_CHANGE` por campo cambiado, con su etiqueta de `content/catalogos.ts`.
- Lo que hoy se guarda sin el antes (si lo hay) se completa en `updateDeal` para que cada cambio tenga los dos valores. No se crea un modelo nuevo.

### P4. Viabilidad

- `Deal.viable Boolean?` y `Deal.viabilityNote String?` en la tarjeta *Calificación*.
- Requisito nuevo `VIABILITY` en `stage-gates.ts`: se exige para ganar (viable = sí, con nota de 10 caracteres o más). *Mi decisión:* no se exige para entrar a etapas intermedias. Se puede subir si el equipo lo pide.

### P5. Barra de avance

- `features/pipeline/stage-progress.tsx`, con `role="progressbar"`, un tramo por etapa pintado con su `color` hasta la actual, y el nombre y el porcentaje encima. Se usa en el formulario de edición y en la cabecera de la ficha.
- *Cambio sobre el diseño:* vive en `features/pipeline/` y no en `components/ui/`, porque solo lo usa el pipeline y depende de su tipo `Stage`. Tampoco hizo falta un token nuevo: el riel usa `--wave-line-strong` y los tramos, el color de cada etapa. Está documentado en `TOKENS.md`.
- Si la ficha no recibe las etapas del pipeline, la barra muestra al menos la etapa actual.

### P6 y P8. Pagos y comprobación

- Modelo nuevo `DealPayment` (`id`, `dealId`, `amount Decimal(14,2)`, `paidAt`, `note`, `createdById`, `createdAt`). Rutas: `POST /deals/:id/payments` y `DELETE /deals/:id/payments/:paymentId`. Cada alta y cada baja quedan en `AuditLog`.
- La ficha muestra el total abonado y el saldo (valor de los productos menos lo abonado). Abonar más que el saldo se rechaza (`422`).
- Ganar envía `paymentConfirmed: true`. Requisito nuevo `PAYMENT_CONFIRMED`: si falta o es `false`, el modal muestra «¿Se comprobó el pago?» y no gana. La respuesta queda en el `AuditLog` del `WON`.
- *Mi decisión:* el saldo no tiene que ser cero para ganar. Manda la respuesta Sí/No del usuario, como pidió el equipo; el saldo es informativo.

### P7 y P12. Notas

- **P7, aclarado por el usuario el 2026-11-11.** La ficha ya mostraba el formulario de notas en todos los estados y el API no las bloquea. El punto del equipo («un campo notas/observaciones para todos los estados del tablero») pide una *observación al mover*: el modal de transición trae un campo opcional *Observaciones*, que se guarda como nota del negocio después de que el movimiento se confirma.
- *Mi decisión:* para que la observación esté en todo movimiento, el modal ya no mueve directo cuando no falta nada. Siempre pide confirmar con *Guardar y continuar*. Es un clic más por arrastre, a cambio del registro que pidió el equipo.
- *Mi decisión:* si la nota falla (por ejemplo, un VENDEDOR sin acceso al historial de ese negocio), el movimiento no se deshace: el aviso dice que el negocio cambió de etapa pero la observación no se guardó.
- En *Guardar e ir a la ficha* (requisitos que solo se completan en la ficha) no se ofrece la observación, porque ahí todavía no se mueve nada.
- `notes.service.ts` avisa también al responsable del negocio (o del contacto) si no es el autor, con el mismo correo sin el texto de CRM-26 y una sola vez.

### P9. Motivos de pérdida

- Nuevo `LossReason.NO_PAYMENT` («No realizó el pago»). La lista del formulario y de la columna Perdido muestra primero los más probables: *No realizó el pago*, *Sin presupuesto*, *Sin respuesta*, *Eligió a la competencia* y *Otro*. El resto queda debajo, en un grupo «Otros motivos».

### P11. Roles

*Mi decisión, pendiente de confirmar con el equipo:*

| Acción | VENDEDOR | ADMIN |
| --- | --- | --- |
| Mover, ganar, perder, rechazar (negocio abierto) | Sí | Sí |
| Enmendar un rechazado / Reversar un ganado o perdido | No | Sí |
| Registrar un abono | Sí | Sí |
| Borrar un abono | No | Sí |
| Configurar etapas (días, requisitos) | No | Sí |

### P13. Productos por cliente

- `GET /contacts/:id/products` y `GET /companies/:id/products`: productos de los negocios `WON`, agrupados por descripción, con cantidad total y fecha del último negocio.
- **Coordinación con CRM-13 a CRM-15.** Las fichas de contactos y empresas son de Eduardo: tocarlas necesita OK del usuario.

### P14. Actividades del negocio en la agenda

Hoy los dos formularios guardan en la misma tabla `Activity`, pero son distintos. El de la ficha (`features/pipeline/activity-actions.tsx`) solo tiene tipo, asunto, una fecha sin hora y una nota. El de la agenda (`features/actividades/agenda.tsx`) tiene además responsable, hora y recordatorio. La agenda muestra el negocio como texto, sin enlace, y no filtra por negocio.

- **Un solo formulario.** `ActivityFields` y el diálogo *Registrar actividad* salen de `agenda.tsx` a `features/actividades/activity-dialog.tsx`. La agenda y la ficha usan el mismo diálogo. En la ficha va vinculado al negocio (y a su contacto) y conserva la casilla *Ya se realizó*, que cumple el requisito `INTERACTION` de las etapas.
- **API.** La ficha sigue usando `POST /deals/:id/activities`, que aplica las reglas del negocio (bloqueo de cerrados, interacción realizada). `CreateDealActivityDto` suma `assigneeId` y `reminderAt`, con las mismas validaciones de `CreateActivityDto`: responsable activo y recordatorio no posterior al vencimiento.
- **Enlaces de ida y vuelta.** En la agenda, el nombre del negocio es un enlace a `/pipeline/[id]`. En la ficha, *Ver en la agenda* lleva a `/actividades?dealId=…`. `ListActivitiesDto` suma el filtro `dealId`, y la agenda lo muestra como un filtro activo que se puede quitar.
- Editar, completar o cancelar desde cualquiera de los dos lados se ve en el otro, porque es la misma fila. No hay datos que sincronizar.
- *Omitido:* elegir un negocio desde la agenda al crear una actividad suelta. Se agrega si el equipo lo pide.

**Al implementar (2026-11-13):**

- *Mi decisión:* en la ficha, el responsable viene elegido con el responsable del negocio. En el API, si no llega, queda quien registra, como en la agenda.
- Una actividad marcada *Ya se realizó* no lleva recordatorio: la web y el API la rechazan, porque no hay nada que recordar.
- *Mi decisión:* en la ficha, los errores se ven dentro del diálogo y lo escrito se conserva. La agenda sigue avisando con su toast. Las dos usan el mismo diálogo con la prop `inlineErrors`.
- El tipo por defecto del diálogo es *Tarea*, como ya tenía la agenda.
- El filtro *Negocio: …* toma el nombre de las actividades listadas. Si el negocio no tiene ninguna, dice «este negocio».

### P15. Iconos en los formularios

- `Field` (`components/form/form-field.tsx`) suma la prop opcional `icon` y la pinta antes de la etiqueta. Los iconos son de `lucide-react`, que ya está instalado. Lleva la misma piel que la agenda (15 px en `--wave-blue`) con la clase general `.field-icon`. Se documenta en `TOKENS.md`.
- Un solo mapa, `FIELD_ICONS` en `components/form/field-icon.tsx`, asigna un icono a cada tipo de dato para que el mismo dato tenga el mismo icono en todas las pantallas. `Field` recibe la clave (`icon="correo"`). Las etiquetas hechas a mano (acceso, usuarios, teléfono, importación) usan `<FieldIcon name="…" />`. Mapa base (el archivo tiene la lista completa: cargo, etiquetas, sitio web, necesidad, solución, evidencia, archivo, color, posición…):

| Dato | Icono |
| --- | --- |
| Nombre, apellido, responsable | `User` / `Users` |
| Correo | `Mail` |
| Teléfono | `Phone` |
| Cédula, RUC, documento | `IdCard` |
| Empresa | `Building2` |
| Provincia, cantón, dirección | `MapPin` |
| Monto, precio, presupuesto, abono | `DollarSign` |
| Fecha, vencimiento | `CalendarDays` / `Clock3` |
| Porcentaje, IVA, probabilidad | `Percent` |
| Producto, cantidad | `Package` / `Hash` |
| Etapa / pipeline | `SquareKanban` / `Workflow` |
| Nota, descripción, motivo | `FileText` |
| Contraseña | `Lock` |
| Rol | `ShieldCheck` |

- Alcance: login, contraseñas, usuarios, contactos, empresas, importación, negocio, productos, calificación, propuestas, configuración del pipeline, transición, notas y actividad del negocio.
- La agenda ya tenía sus iconos. Su formulario pasó a `Field` en P14 (bloque 2), al compartirlo con la ficha.
- *Mi decisión:* no llevan icono los buscadores, los filtros de las barras de herramientas (ya tienen su lupa o su chip), las casillas (requisitos de etapa, términos) ni las celdas de la tabla de productos, donde el icono va en el encabezado de cada columna.
- **Coordinación con CRM-14 y CRM-15.** Los formularios de contactos y empresas son de Eduardo: solo se les suma la prop `icon`, sin cambiar su lógica. Esto también necesita OK.

### Datos y migración

- Una sola migración: `Stage.staleDays`, `Deal.viable`, `Deal.viabilityNote`, `DealPayment`, `LossReason.NO_PAYMENT` y `StageRequirement.VIABILITY` / `PAYMENT_CONFIRMED`.
- Se aplica primero en `pruebas` y pasa a `development` solo con OK del usuario. Nunca con base sombra en Neon.

### Orden de trabajo

1. Textos y correcciones sin migración: P0, P2, P10, P5, P7, y P15 (iconos), que toca los mismos formularios.
2. P14 (actividades): sin migración, solo un DTO y un filtro nuevos.
3. Migración y reglas: P9, P4, P6, P8, P1.
4. Historial, correo y roles: P3, P12, P11.
5. P13, con OK para tocar las fichas de contactos y empresas.

## Validación

### Bloque 1 (2026-11-11)

- **Web (Vitest):** 87 archivos y 381 pruebas aprobadas.
  - `amount.test.ts` cubre los casos válidos e inválidos del monto y la ida y vuelta `formatAmount` → `parseAmount`.
  - `actions.test.ts` comprueba que la observación se publica como nota después de mover, que con más de 5000 caracteres no se mueve nada, y el aviso si la nota falla.
- **API:** `node --test test/unitarias/*/*.test.cjs`, 263 de 263 aprobadas (cambiaron sus mensajes de «Reabre» a «Reversa»).
- **Lint y tipos:**
  - `pnpm lint` aprobado (exit 0) y `tsc --noEmit` de la web sin errores.
  - `@wave/shared`, `@wave/database` (`tsc`) y `@wave/api` (`nest build`) compilan.
- **Build completo de la web: pendiente** (cerrado en el bloque 2).
  - `pnpm build` se detuvo en `prisma generate` (`EPERM`): el `pnpm run dev` del usuario tiene abierto `query-engine-windows.exe`. El esquema no cambió en este bloque.
  - `next build` no se corrió para no pisar la carpeta `.next` del `next dev` en marcha.
- **Revisión visual: pendiente.** El panel del navegador pide iniciar sesión, y la contraseña de desarrollo no está en el repo (el seed solo guarda el hash).

### Bloque 2 (2026-11-13)

- **Web (Vitest):** 384 pruebas aprobadas.
  - `deal-timeline.test.tsx` comprueba que el diálogo de la ficha trae el responsable del negocio, el recordatorio y *Ya se realizó*, que un error del API se ve dentro sin borrar lo escrito y que, al guardar, se cierra y refresca.
  - `agenda.test.tsx` comprueba el enlace a `/pipeline/d1` y que quitar el filtro conserva los demás (`?type=CALL`).
- **API:** 265 de 265 aprobadas.
- **Lint, tipos y build:** `pnpm lint` (exit 0), `tsc --noEmit` de la web sin errores y `pnpm build` completo aprobado (exit 0, 18 páginas), con el `pnpm run dev` ya detenido. Cierra el pendiente del bloque 1.
- `graphify update .` corrido.
- **Revisión visual y E2E: pendientes**, por el mismo motivo del bloque 1.

## Pendientes

- Revisar en el navegador los iconos, la barra, el modal y el diálogo de actividad de la ficha, y ejecutar el E2E del pipeline (`test/e2e/pipeline.spec.ts`, ajustado a *Reversar* y al diálogo de actividad). Hace falta el `pnpm run dev` y una sesión iniciada.
- Confirmar con el equipo la tabla de roles de P11 y si la viabilidad (P4) se exige antes de llegar a Propuesta.
- Avisar a Eduardo:
  - Cambios en su módulo de pipeline. El modal de transición ya no mueve directo: siempre confirma con observación opcional. Se borraron `moveTransition()` y el `POST` de `app/api/pipeline/deals/[id]/transition`.
  - El monto usa coma decimal.
  - La actividad de la ficha usa el diálogo de la agenda: `createActivityAction(dealId, form)` cambió de firma y `CreateDealActivityDto` suma `assigneeId` y `reminderAt`.
  - Iconos en sus formularios de contactos y empresas.
  - La migración nueva del bloque 3.
  - Si se aprueba P13, cambios en sus fichas.
