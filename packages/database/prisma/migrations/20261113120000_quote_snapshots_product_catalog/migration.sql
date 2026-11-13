-- Catálogo comercial sin inventario; DealItem.productId es opcional para preservar líneas manuales.
CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" DECIMAL(14,2) NOT NULL,
  "taxRate" INTEGER NOT NULL DEFAULT 15,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");
CREATE INDEX "Product_isActive_description_idx" ON "Product"("isActive", "description");
ALTER TABLE "DealItem" ADD COLUMN "productId" TEXT;
CREATE INDEX "DealItem_productId_idx" ON "DealItem"("productId");
ALTER TABLE "DealItem" ADD CONSTRAINT "DealItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Quote" ADD COLUMN "snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb;
-- Preserve all existing proposal rows and their status; assign a stable sequence per deal.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "dealId" ORDER BY "createdAt", "id") AS n
  FROM "Quote"
)
UPDATE "Quote" q SET "version" = ranked.n FROM ranked WHERE q."id" = ranked."id";
CREATE UNIQUE INDEX "Quote_dealId_version_key" ON "Quote"("dealId", "version");
ALTER TABLE "DealItem" ADD COLUMN "discountRate" INTEGER NOT NULL DEFAULT 0;
