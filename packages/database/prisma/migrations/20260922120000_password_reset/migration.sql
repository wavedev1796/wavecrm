-- Recuperación de contraseña (Sprint 1 / Ticket 08)
-- Columnas propias en vez de reutilizar las de invitación: los dos flujos conviven en la misma
-- cuenta (una invitación pendiente no tiene contraseña que recuperar) y una columna con dos
-- significados es donde se cuela el fallo al cambiar una condición.
ALTER TABLE "User" ADD COLUMN "passwordResetTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_passwordResetTokenHash_key" ON "User"("passwordResetTokenHash");
