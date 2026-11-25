-- CRM-31 (Sprint 5): entrega de cotizaciones aceptadas a Wave Billing y configuración general (IVA).
-- Generada con `prisma migrate diff` entre esquemas, sin base sombra; CHECKs y fila inicial a mano.
-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'FAILED', 'SENT', 'AUTHORIZED', 'RETURNED', 'NOT_AUTHORIZED');


-- CreateTable
CREATE TABLE "BillingHandoff" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "status" "BillingStatus" NOT NULL,
    "buyer" JSONB NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "accessKey" TEXT,
    "sequential" TEXT,
    "authorizationNumber" TEXT,
    "authorizedAt" TIMESTAMP(3),
    "messages" JSONB NOT NULL DEFAULT '[]',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingHandoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "taxRate" INTEGER NOT NULL DEFAULT 15,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingHandoff_quoteId_key" ON "BillingHandoff"("quoteId");

-- AddForeignKey
ALTER TABLE "BillingHandoff" ADD CONSTRAINT "BillingHandoff_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- IVA general: de 0 a 100 (no se expresa en schema.prisma); una sola fila, id = 1.
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_taxRate_range" CHECK ("taxRate" BETWEEN 0 AND 100);
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_singleton" CHECK ("id" = 1);
INSERT INTO "AppSettings" ("id","taxRate") VALUES (1,15);
