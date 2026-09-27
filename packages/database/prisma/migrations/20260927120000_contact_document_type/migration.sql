-- Tipo de documento del contacto (ajustes del Sprint 2): cédula, RUC de persona natural o pasaporte.
CREATE TYPE "DocumentType" AS ENUM ('CEDULA', 'RUC', 'PASAPORTE');

ALTER TABLE "Contact" ADD COLUMN "documentType" "DocumentType";

-- Hasta hoy el documento de un contacto solo podía ser una cédula.
UPDATE "Contact" SET "documentType" = 'CEDULA' WHERE "documentId" IS NOT NULL;

-- Tipo y número van juntos también en la base (Prisma no modela CHECK; lo protege documentos.http.test.cjs).
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_document_pair" CHECK (("documentId" IS NULL) = ("documentType" IS NULL));
