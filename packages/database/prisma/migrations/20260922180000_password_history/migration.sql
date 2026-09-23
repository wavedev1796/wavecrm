-- Historial de contraseñas (Sprint 1 / Ticket 08)
-- Guarda los hashes de las contraseñas anteriores para impedir que se reutilicen.
-- Son hashes argon2, igual que `passwordHash`: la contraseña en claro no se guarda nunca.
ALTER TABLE "User" ADD COLUMN "previousPasswordHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
