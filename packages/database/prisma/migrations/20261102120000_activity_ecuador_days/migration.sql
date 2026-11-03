-- CRM-22 (Sprint 4, 2026-11-02): las fechas de una actividad son instantes y un día sin hora es las
-- 00:00 de Ecuador (05:00 UTC), como ya guardaba la agenda. La ficha del negocio guardaba el día a las
-- 00:00 UTC y la agenda lo pintaba el día anterior a las 19:00: se corren esas fechas a las 00:00 de Ecuador.
-- Límite conocido: una actividad de la agenda puesta justo a las 19:00 de Ecuador (00:00 UTC) también se corre.

UPDATE "Activity" SET "dueAt" = "dueAt" + INTERVAL '5 hours'
WHERE "dueAt" = date_trunc('day', "dueAt");

UPDATE "Activity" SET "completedAt" = "completedAt" + INTERVAL '5 hours'
WHERE "completedAt" = date_trunc('day', "completedAt");
