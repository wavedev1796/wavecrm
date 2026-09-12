-- Invitaciones y activación de cuentas (Sprint 1 / Ticket 07)
ALTER TABLE "User" ADD COLUMN "invitationTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "invitationExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "invitationSentAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "activatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_invitationTokenHash_key" ON "User"("invitationTokenHash");
CREATE INDEX "User_invitationExpiresAt_idx" ON "User"("invitationExpiresAt");

-- Las cuentas preexistentes con contraseña ya estaban activadas antes de este ticket.
UPDATE "User" SET "activatedAt" = "createdAt" WHERE "passwordHash" IS NOT NULL;
