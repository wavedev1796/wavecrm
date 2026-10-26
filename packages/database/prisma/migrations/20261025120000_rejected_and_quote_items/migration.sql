-- Revisión del flujo comercial (Sprint 3, 2026-10-25): Perdido y Rechazado son dos cierres distintos
-- y la propuesta guarda los productos con los que se envió.
-- Escrita a mano: Prisma recrearía LossReason (DROP/CREATE) y fallaría con los negocios que ya tienen motivo.

-- AlterEnum: rechazado es la decisión explícita de no continuar; va a la papelera (/pipeline/papelera).
ALTER TYPE "DealStatus" ADD VALUE 'REJECTED';

-- AlterEnum: LossReason pasa a ser el motivo de cualquier cierre. Los de perdido y los de rechazado
-- se separan en @wave/shared (LOSS_REASONS y REJECTION_REASONS); OTHER vale para los dos.
-- PRICE pasa a «Problemas de negociación» (precio o condiciones): los negocios que lo tenían lo conservan.
ALTER TYPE "LossReason" RENAME VALUE 'PRICE' TO 'NEGOTIATION';
ALTER TYPE "LossReason" ADD VALUE 'NEED_POSTPONED';
ALTER TYPE "LossReason" ADD VALUE 'PRIORITY_CHANGE';
ALTER TYPE "LossReason" ADD VALUE 'CLIENT_DECLINED';
ALTER TYPE "LossReason" ADD VALUE 'PRODUCT_MISMATCH';
ALTER TYPE "LossReason" ADD VALUE 'REQUIREMENTS_UNMET';
ALTER TYPE "LossReason" ADD VALUE 'COMMERCIAL_RISK';
ALTER TYPE "LossReason" ADD VALUE 'OUT_OF_SCOPE';
ALTER TYPE "LossReason" ADD VALUE 'DO_NOT_CONTACT';

-- Los cierres ya registrados guardan el código en JSON: se renombra igual para que la línea de tiempo lo siga mostrando.
UPDATE "AuditLog" SET "changes" = jsonb_set("changes", '{lossReason}', '"NEGOTIATION"')
WHERE "entityType" = 'Deal' AND "changes"->>'lossReason' = 'PRICE';

-- AlterTable: copia de { description, quantity, unitPrice, taxRate } al registrar la propuesta.
-- Las propuestas anteriores quedan con [] («Registrada sin detalle de productos»).
ALTER TABLE "Quote" ADD COLUMN "items" JSONB NOT NULL DEFAULT '[]';
