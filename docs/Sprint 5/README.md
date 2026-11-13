# Sprint 5 — Cotización versionada y handoff a Billing

## Objetivo

Conservar versiones de cotización con snapshots históricos y preparar la transición comercial hacia Billing. Los diagramas de flujo y casos de uso recibidos son contexto planificado; cada ticket registra su alcance realmente implementado.

## Tickets

| CRM | Ticket | Estado |
| --- | --- | --- |
| CRM-27 | [Modelo Cotización + productos](27 - Modelo Cotización y productos.md) | Completo (4/4 criterios) |
| CRM-28 | [API cotizaciones](28 - API cotizaciones.md) | Completo (4/4 criterios) |
| CRM-29 | [Armar cotización](29 - Armar cotización.md) | Completo (4/4 criterios) |

## Validación

CRM-27 y CRM-28 fueron migrados en desarrollo y pruebas. CRM-27 validó administración y reutilización del catálogo por HTTP; CRM-28 validó el flujo de pipeline HTTP (12/12). Las unitarias API pasan 276/276 y las pruebas web de esos tickets 51/51. CRM-29 añade edición y vista previa de cotización; PDF y Billing siguen planificados según los diagramas.
