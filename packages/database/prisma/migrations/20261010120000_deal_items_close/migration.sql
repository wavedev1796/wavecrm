-- CreateEnum
CREATE TYPE "LossReason" AS ENUM ('PRICE', 'COMPETITOR', 'NO_BUDGET', 'NO_RESPONSE', 'BAD_TIMING', 'OTHER');

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "lossDetail" TEXT,
ADD COLUMN     "lossReason" "LossReason";

-- CreateTable
CREATE TABLE "DealItem" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "taxRate" INTEGER NOT NULL DEFAULT 15,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealItem_dealId_position_idx" ON "DealItem"("dealId", "position");

-- AddForeignKey
ALTER TABLE "DealItem" ADD CONSTRAINT "DealItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

