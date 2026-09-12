# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pymes ecuatorianas. Wave CRM se entrega a otras empresas de Ecuador, no es una herramienta interna de The Wave Sea, así que la interfaz debe funcionar para equipos que nunca recibirán capacitación del autor.

Dos roles en el sistema (`UserRole` en Prisma):

- **VENDEDOR** — usuario principal. Gestiona su pipeline, contactos, empresas, cotizaciones y actividades. Trabaja **desde un computador de escritorio en la oficina**, en sesiones largas: la densidad de información, las tablas y el trabajo con teclado pesan más que la comodidad táctil.
- **ADMIN** — administra las cuentas del equipo además de vender.

## Product Purpose

Gestión comercial de punta a punta para un equipo de ventas pequeño: seguir negocios por etapas del pipeline, mantener el directorio de contactos y empresas, emitir cotizaciones, registrar actividades y consultar reportes. El éxito es que un vendedor sepa, sin preguntarle a nadie, qué negocio debe atender hoy y en qué quedó la última conversación.

## Positioning

Tres cosas que deben preservarse en cualquier trabajo futuro:

1. **Hecho para Ecuador.** Validación de RUC y cédula, provincias y ciudades del país, montos en dólares. Es la promesa explícita del styleguide del equipo ("El CRM hecho para Ecuador").
2. **Simplicidad frente a los CRMs grandes.** Lo esencial de la venta sin la complejidad ni el precio de las suites internacionales. Toda función nueva compite contra el costo de complicar la herramienta.
3. **Cotizaciones integradas.** La cotización vive dentro del negocio (`Quote` cuelga de `Deal`), no en una herramienta aparte.

## Operating Context

- Interfaz íntegramente en **español**; el equipo y los clientes son ecuatorianos.
- Moneda por defecto **USD**, con montos en números tabulares.
- Datos geográficos por **provincia y ciudad** del Ecuador.
- Uso principal en escritorio. Existe comportamiento responsivo (sidebar convertido en panel con backdrop bajo 760 px, pantallas de acceso apiladas bajo 860 px), pero el móvil es un caso secundario, no el escenario de diseño.

## Capabilities and Constraints

Implementado hoy:

- Rutas del producto: `/pipeline`, `/contactos`, `/empresas`, `/cotizaciones`, `/actividades`, `/reportes` y `/usuarios` (solo administradores), más `/login`, `/recuperar-contrasena` y `/activar-cuenta`.
- Autenticación con JWT (access 15 min + refresh de 8 horas renovables con rotación), contraseñas con argon2, límite de 5 intentos por minuto en el login, guards por rol y sesión en cookies `httpOnly`.
- Sesión de trabajo de una jornada: quien usa la app no pierde la sesión; tras 8 horas sin actividad se pide login. Todas las rutas internas exigen sesión y el cierre de sesión la revoca en el servidor.
- Entidades: User, Company, Contact, Deal, Pipeline, Stage, Activity, Quote, Note, Attachment, AuditLog.
- Gestión administrativa de usuarios con invitación por correo, activación, edición, desactivación, reactivación y eliminación segura.

Restricciones técnicas:

- Monorepo pnpm: Next.js App Router (`apps/web`), NestJS (`apps/api`), Prisma + PostgreSQL (`packages/database`). Node 22+.
- Contratos HTTP fijos: prefijo `/api/v1`, respuesta paginada `{ data, meta }` y error `{ error: { status, message, path, timestamp } }`.
- Tipografía Plus Jakarta Sans Variable servida localmente, sin CDN.
- Despliegue en Render; base de datos Neon en producción.

Decisiones de producto abiertas (no inventar una respuesta):

- El envío de correo para recuperar contraseña sigue pendiente; el ticket CRM-7 incorporó correo para invitaciones, no el flujo de recuperación.
- No hay definición de precios, planes ni modelo de licenciamiento.

## Brand Commitments

- Nombre **Wave CRM**, de The Wave Sea (thewavesea.com). Marca gráfica: cuadro azul con la letra "W".
- Pie de las pantallas de acceso: "© 2026 Wave · thewavesea.com".
- El sistema visual es vinculante y ya existe: `apps/web/app/globals.css` es la fuente de verdad ejecutable, documentada en `docs/design/TOKENS.md` y con la guía original en `docs/design/crm-wave-styleguide.html`. Cualquier cambio de tokens se documenta primero en TOKENS.md.
- Voz de la interfaz: español neutro, tuteo, frases cortas y directas ("Inicia sesión", "Ingresa con tu cuenta del equipo").

## Evidence on Hand

- `docs/design/crm-wave-styleguide.html` — guía visual original del equipo, incluye la pantalla de inicio de sesión ya diseñada.
- `docs/design/TOKENS.md` — tokens de color, tipografía, forma, espacio, movimiento y estados.
- `docs/Sprint 1/` — tickets del sprint activo con criterios de aceptación.
- `packages/database/prisma/seed.mjs` — datos de desarrollo.

Ausencias que el trabajo futuro **no debe rellenar inventando**:

- Los datos del seed y los números de la pantalla de pipeline (Comercial Andina, María Cordero, "$84.5k", "37 negocios abiertos") son **ficticios, de demostración**. No presentarlos como clientes o métricas reales.
- No existen testimonios, casos de éxito, logos de clientes, prensa ni benchmarks. No fabricarlos.
- No hay precios ni planes publicados.

## Product Principles

1. **Cada función nueva paga su complejidad.** La simplicidad frente a las suites grandes es una posición competitiva, no una etapa temporal.
2. **Ecuador no es una localización, es el producto.** RUC, cédula, provincias y dólares se tratan como ciudadanos de primera clase, no como configuración regional.
3. **La densidad sirve al vendedor de escritorio.** Ante la duda entre aire y cantidad de información útil a la vista, gana la información: son sesiones largas de trabajo, no visitas ocasionales.
4. **El vendedor debe orientarse solo.** Sin capacitación de por medio: estados, errores y siguientes pasos se explican en la propia interfaz y en español claro.
5. **El negocio es el centro.** Contactos, actividades y cotizaciones existen para mover un negocio por el pipeline; su diseño se juzga por cuánto ayudan a eso.

## Accessibility & Inclusion

No se ha establecido un estándar formal (WCAG u otro) como requisito de producto: queda como decisión abierta. La implementación actual ya sostiene un piso que no debe perderse: anillo de foco visible de 3 px en todos los controles, texto alternativo accesible mediante `.sr-only`, y respeto a `prefers-reduced-motion`.
