-- Enum UserRole: ADMIN/MANAGER/SALES -> ADMIN/VENDEDOR
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'VENDEDOR');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new"
  USING (CASE WHEN "role"::text = 'ADMIN' THEN 'ADMIN' ELSE 'VENDEDOR' END::"UserRole_new");
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'VENDEDOR';

-- Campos de autenticacion (CRM-6)
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "refreshTokenHash" TEXT;
