-- Modelo Contacto/Empresa para Ecuador (Sprint 2 / Ticket 11)
-- Contactos y empresas comparten provincia/ciudad, correo y etiquetas de segmentación. Las etiquetas
-- usan índice GIN porque el filtro por etiqueta es un `has` (operador @> de arreglos).
ALTER TABLE "Company" ADD COLUMN "email" TEXT,
ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Contact" ADD COLUMN "city" TEXT;

CREATE INDEX "Company_tags_idx" ON "Company" USING GIN ("tags");

CREATE INDEX "Contact_province_city_idx" ON "Contact"("province", "city");

CREATE INDEX "Contact_tags_idx" ON "Contact" USING GIN ("tags");
