-- Revisión del equipo (2026-10-31), bloque 3: motivo «No realizó el pago» (P9), días sin actividad por etapa (P1),
-- viabilidad del negocio (P4) y abonos sin comprobante (P6). Generada con `prisma migrate diff` entre esquemas,
-- sin base sombra.

-- AlterEnum
ALTER TYPE "LossReason" ADD VALUE 'NO_PAYMENT';

-- AlterTable
ALTER TABLE "Stage" ADD COLUMN     "staleDays" INTEGER;

-- Días sin actividad: de 1 a 365, o vacío para no alertar (no se expresa en schema.prisma).
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_staleDays_range" CHECK ("staleDays" IS NULL OR "staleDays" BETWEEN 1 AND 365);

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "viabilityNote" TEXT,
ADD COLUMN     "viable" BOOLEAN;

-- CreateTable
CREATE TABLE "DealPayment" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealPayment_pkey" PRIMARY KEY ("id")
);

-- Un abono es siempre positivo (no se expresa en schema.prisma).
ALTER TABLE "DealPayment" ADD CONSTRAINT "DealPayment_amount_positive" CHECK ("amount" > 0);

-- CreateIndex
CREATE INDEX "DealPayment_dealId_paidAt_idx" ON "DealPayment"("dealId", "paidAt");

-- AddForeignKey
ALTER TABLE "DealPayment" ADD CONSTRAINT "DealPayment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealPayment" ADD CONSTRAINT "DealPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
