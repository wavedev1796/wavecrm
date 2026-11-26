# Sprint 5 — Cotización versionada y handoff a Billing

## Objetivo

Conservar versiones de cotización con snapshots históricos y preparar la transición comercial hacia Billing. Los diagramas de flujo y casos de uso recibidos son contexto planificado; cada ticket registra su alcance realmente implementado.

## Tickets

| CRM | Ticket | Responsable | Estado |
| --- | --- | --- | --- |
| CRM-27 | [Modelo Cotización + productos](27 - Modelo Cotización y productos.md) | Eduardo Garcia | Completo (4/4 criterios) |
| CRM-28 | [API cotizaciones](28 - API cotizaciones.md) | Eduardo Garcia | Completo (4/4 criterios) |
| CRM-29 | [Armar cotización](29 - Armar cotización.md) | Eduardo Garcia y Zaith Manangón | Completo (4/4 criterios) |
| CRM-30 | [PDF de cotización (marca Wave)](30 - PDF de cotización (marca Wave).md) | Zaith Manangón | Completo (4/4 criterios) |
| CRM-31 | [Puente a Wave Billing](31 - Puente a Wave Billing.md) | Zaith Manangón | Completo (4/4 criterios) |

## Validación

CRM-27 y CRM-28 fueron migrados en desarrollo y pruebas. CRM-27 validó administración y reutilización del catálogo por HTTP; CRM-28 validó el flujo de pipeline HTTP (12/12). Las unitarias API pasan 276/276 y las pruebas web de esos tickets 51/51. CRM-29 añade edición, vista previa y el listado `/cotizaciones` con filtros; CRM-30, el documento imprimible de cada versión. CRM-31 entrega la venta ganada a Wave Billing desde la ficha (enviar, reintentar, consultar, reemitir, reenviar, RIDE y XML), añade la página *Configuración* con el IVA general y bloquea reversar o eliminar una venta con factura; unitarias API 330/330 y web 465/465, recorrido real contra Billing en ambiente de pruebas. El envío de la cotización por correo queda en CRM-36.
