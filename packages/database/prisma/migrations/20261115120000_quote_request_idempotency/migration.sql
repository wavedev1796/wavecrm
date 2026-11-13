ALTER TABLE "Quote" ADD COLUMN "requestKey" TEXT;
ALTER TABLE "Quote" ADD COLUMN "requestHash" TEXT;
CREATE UNIQUE INDEX "Quote_requestKey_key" ON "Quote"("requestKey");
