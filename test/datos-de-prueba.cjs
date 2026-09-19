// Utilidades para las pruebas que usan la base real: integración del API (node:test) y e2e (Playwright).
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { parseEnv } = require("node:util");

const DOMAIN = "@pruebas.example.com";
const PASSWORD = "Prueba#2026";
// argon2id de PASSWORD, generado una vez: crear usuarios de prueba no necesita calcular hashes.
const PASSWORD_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$1YzOgLLQicFzwpl84aZ3mg$UYl78c+h0fTdWd/rMWs8vWxoKOdLnGskd+rTK6+F3Ds";

/** Detiene la ejecución si la base no es la rama `pruebas`: la de `.env` es `development`. */
function assertTestDatabase() {
  let shared;
  try {
    shared = parseEnv(readFileSync(join(__dirname, "..", ".env"), "utf8")).DATABASE_URL;
  } catch {
    shared = undefined; // Sin .env (CI): basta con que DATABASE_URL exista.
  }
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL === shared) {
    throw new Error(
      'Estas pruebas crean y borran datos. Córrelas con `pnpm test:integration`, `pnpm test:e2e` o `pnpm test:coverage`, que cargan .env.test.local (rama "pruebas" de Neon).',
    );
  }
}

let sequence = 0;
function uniqueEmail(label) {
  sequence += 1;
  return `${label}-${Date.now()}-${sequence}${DOMAIN}`;
}

/** Cuenta activa con PASSWORD, o pendiente de activación (sin contraseña) si `pending`. */
function createUser(prisma, { role = "VENDEDOR", active = true, name = "Persona Prueba", pending = false } = {}) {
  return prisma.user.create({
    data: {
      email: uniqueEmail(role.toLowerCase()),
      name,
      role,
      active: pending ? false : active,
      passwordHash: pending ? null : PASSWORD_HASH,
      activatedAt: pending ? null : new Date(),
    },
  });
}

/** Fija un token de invitación conocido: las pruebas no leen el correo. */
async function setInvitationToken(prisma, email, token) {
  await prisma.user.update({
    where: { email },
    data: {
      invitationTokenHash: createHash("sha256").update(token).digest("hex"),
      invitationExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
}

/** Borra los usuarios de prueba y su auditoría. Nunca toca otros usuarios. */
async function cleanup(prisma) {
  const users = await prisma.user.findMany({ where: { email: { endsWith: DOMAIN } }, select: { id: true } });
  const ids = users.map((user) => user.id);
  if (!ids.length) return;
  await prisma.auditLog.deleteMany({ where: { OR: [{ userId: { in: ids } }, { entityId: { in: ids } }] } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

module.exports = { PASSWORD, uniqueEmail, createUser, setInvitationToken, cleanup, assertTestDatabase };
