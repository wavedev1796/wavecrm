-- Registra cuándo y qué versión de los términos aceptó el usuario al activar su cuenta.
ALTER TABLE "User"
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT;
