# Documentación de Wave CRM

| Carpeta            | Contenido                                                      |
| ------------------ | -------------------------------------------------------------- |
| `Sprint X/`        | Un `.md` por ticket, un `README.md` con el resumen del sprint y, al cierre, `Reporte del Sprint X.md` |
| `Calidad/`         | Pruebas por sprint, SonarQube y deuda técnica                  |
| `Infraestructura/` | Notas que no pertenecen a un ticket (Neon)                     |
| `design/`          | Tokens y guía visual                                           |
| `postman/`         | Colección para probar el API                                   |

## Estándar de tickets

Cada ticket vive en `docs/Sprint X/` y se nombra con su número CRM: `XX - Título.md` (`06 - …` es CRM-6). En el nombre del archivo, `/` y `+` del título se escriben `-`.

Estructura obligatoria, en este orden:

```markdown
# CRM-6 — Título del ticket

**Responsable:** Nombre Apellido · **Estado:** Completo (4/4 criterios)

## Objetivo

Descripción breve de qué se resuelve y por qué.

## Criterios de aceptación

- [ ] Criterio verificable 1.
- [ ] Criterio verificable 2.

## Implementación

Archivos creados o modificados con ruta completa.

## Decisiones

Justificación de decisiones técnicas relevantes.

## Validación

Cómo se verificó que el ticket está completo.

## <Cambio posterior> (AAAA-MM-DD)

### Implementación

### Decisiones

### Validación

## Pendientes

- Lo que queda abierto.
```

Reglas:

- Antes de empezar: todos los criterios como `- [ ]`. Al completar: `- [x]`.
- Cierre obligatorio: _Implementación_, _Decisiones_ y _Validación_. Si no hubo decisiones, se dice en una línea; la sección no se omite.
- **Estado:** `En curso`, `Parcial (n/m criterios)` o `Completo (n/n criterios)`, igual que en la tabla del `README.md` del sprint. Detrás del paréntesis puede ir una frase de contexto (autorizaciones, quién entregó qué).
- **Criterios sin escribir:** si el ticket llegó sin criterios, se deducen de su título o del pedido y se avisa en una línea antes de la lista: "El ticket no trae criterios escritos; salen de …".
- **Detalle dentro de las secciones:** endpoints, contratos, rutas, API/Web o "Cómo probarlo a mano" van como `###` dentro de _Implementación_, _Decisiones_ o _Validación_, nunca como `##` sueltos.
- **Cambios posteriores al cierre** (calidad, rediseño, ajustes pedidos): un bloque `## <Qué cambió> (AAAA-MM-DD)` al final, con las subsecciones `###` que apliquen. Si otra persona añade el bloque en un ticket ajeno, lo dice en su primera línea.
- **Pendientes:** solo si algo queda abierto, siempre como última sección.
- **Coordinación con otro ticket** (un módulo compartido que cambió): va en _Decisiones_ como `**Coordinación con CRM-N.**`.
- Documentos sin número CRM (pedidos del usuario, como _Ajustes de contactos y empresas_): misma estructura, con `# Título` sin prefijo.
- Decisiones técnicas fuera de ticket: en el ticket más cercano o en una nota en `docs/`.

## Reporte del sprint

Uno por sprint, al cierre: `docs/Sprint X/Reporte del Sprint X.md`. Es el balance del equipo sobre el sprint completo; los reportes semanales de cada persona no van en el repositorio. Modelo: [Reporte del Sprint 1](Sprint%201/Reporte%20del%20Sprint%201.md).

```markdown
# Reporte del Sprint X — Nombre del sprint

**Periodo:** del D al D de mes de AAAA
**Equipo:** Nombre Apellido y Nombre Apellido · **Fecha del reporte:** D de mes de AAAA

## 1. Resumen ejecutivo

Dos párrafos: qué entrega el sprint y qué queda pendiente; resultado de calidad.

## 2. Tickets cerrados

| CRM | Ticket | Responsable | Resultado |

Commits del periodo: total y por persona.

## 3. Métricas de calidad

| Métrica | Valor |   (pruebas por capa, cobertura, Quality Gate)

Punto de partida del sprint.

## 4. Hallazgos encontrados y corregidos

| # | Hallazgo | Impacto | Corrección |

## 5. Impedimentos

## 6. Siguientes pasos (Sprint X+1)
```
