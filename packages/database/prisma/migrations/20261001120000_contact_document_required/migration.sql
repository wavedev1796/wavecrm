-- El documento del contacto es obligatorio (2026-10-01): tipo y número, siempre juntos.
-- Falla si queda algún contacto sin documento; esos datos se corrigen a mano antes de desplegar.
ALTER TABLE "Contact" ALTER COLUMN "documentType" SET NOT NULL,
ALTER COLUMN "documentId" SET NOT NULL;

-- Con las dos columnas NOT NULL, la restricción de tipo y número juntos ya no aporta nada.
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_document_pair";
