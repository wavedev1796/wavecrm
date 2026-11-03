-- Preserve activity history when its related company, contact, or deal is deleted.
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_companyId_fkey";
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Activity" DROP CONSTRAINT "Activity_contactId_fkey";
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Activity" DROP CONSTRAINT "Activity_dealId_fkey";
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
