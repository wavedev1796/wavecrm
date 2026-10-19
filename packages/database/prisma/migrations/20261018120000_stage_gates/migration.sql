-- Reglas de transición del pipeline (Sprint 3, 2026-10-18).
-- Todo es columna nueva opcional o con valor por defecto: los datos existentes no cambian.

-- CreateEnum
CREATE TYPE "StageRequirement" AS ENUM ('CONTACT', 'OWNER', 'INTERACTION', 'NEED', 'NEXT_ACTIVITY', 'SOLUTION', 'BUDGET', 'EXPECTED_CLOSE', 'PROPOSAL_SENT');

-- AlterEnum: propuesta reemplazada por otra o por un cambio de productos (EXPIRED es otra cosa: venció su vigencia).
ALTER TYPE "QuoteStatus" ADD VALUE 'SUPERSEDED';

-- AlterTable
ALTER TABLE "Stage" ADD COLUMN     "requirements" "StageRequirement"[] NOT NULL DEFAULT ARRAY[]::"StageRequirement"[];

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "budget" DECIMAL(14,2),
ADD COLUMN     "budgetNote" TEXT,
ADD COLUMN     "decisionMaker" TEXT,
ADD COLUMN     "need" TEXT,
ADD COLUMN     "solution" TEXT;

-- AlterTable
ALTER TABLE "DealStageHistory" ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "acceptanceNote" TEXT,
ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "sentAt" TIMESTAMP(3);

-- IVA editable: entero de 0 a 100 (no se expresa en schema.prisma).
ALTER TABLE "DealItem" ADD CONSTRAINT "DealItem_taxRate_range" CHECK ("taxRate" BETWEEN 0 AND 100);

-- Requisitos del pipeline predeterminado del seed, por posición (nunca por nombre).
UPDATE "Stage" SET "requirements" = ARRAY['CONTACT', 'OWNER', 'INTERACTION', 'NEED', 'NEXT_ACTIVITY']::"StageRequirement"[]
WHERE "pipelineId" = 'wave-default-pipeline' AND "position" = 2;
UPDATE "Stage" SET "requirements" = ARRAY['SOLUTION', 'BUDGET', 'PROPOSAL_SENT', 'EXPECTED_CLOSE']::"StageRequirement"[]
WHERE "pipelineId" = 'wave-default-pipeline' AND "position" = 3;
