const { test } = require("node:test");
const assert = require("node:assert/strict");
const { ForbiddenException, UnauthorizedException } = require("@nestjs/common");
const {
  JwtAuthGuard,
  RolesGuard,
} = require("../dist/modules/auth/auth.guards.js");

function context(request = { headers: {} }) {
  return {
    request,
    getHandler: () => "handler",
    getClass: () => "class",
    switchToHttp: () => ({ getRequest: () => request }),
  };
}

test("JwtAuthGuard permite rutas públicas sin token", async () => {
  const reflector = { getAllAndOverride: () => true };
  const guard = new JwtAuthGuard(
    { verifyAsync: async () => assert.fail("no debe verificar") },
    reflector,
    {},
  );
  assert.equal(await guard.canActivate(context()), true);
});

test("JwtAuthGuard exige Bearer token", async () => {
  const guard = new JwtAuthGuard({}, { getAllAndOverride: () => false }, {});
  await assert.rejects(
    guard.canActivate(context()),
    (error) =>
      error instanceof UnauthorizedException &&
      error.message === "Token de acceso requerido.",
  );
});

test("JwtAuthGuard valida cuenta activa y refresca rol y correo desde la base", async () => {
  const request = { headers: { authorization: "Bearer access-token" } };
  const guard = new JwtAuthGuard(
    {
      verifyAsync: async () => ({
        sub: "user-1",
        email: "anterior@empresa.ec",
        role: "VENDEDOR",
        type: "access",
      }),
    },
    { getAllAndOverride: () => false },
    {
      user: {
        findUnique: async () => ({
          active: true,
          email: "actual@empresa.ec",
          role: "ADMIN",
        }),
      },
    },
  );

  assert.equal(await guard.canActivate(context(request)), true);
  assert.equal(request.user.email, "actual@empresa.ec");
  assert.equal(request.user.role, "ADMIN");
});

test("JwtAuthGuard rechaza refresh tokens y usuarios inactivos", async () => {
  for (const setup of [
    {
      payload: { sub: "user-1", type: "refresh" },
      user: { active: true },
    },
    {
      payload: { sub: "user-1", type: "access" },
      user: { active: false },
    },
  ]) {
    const guard = new JwtAuthGuard(
      { verifyAsync: async () => setup.payload },
      { getAllAndOverride: () => false },
      { user: { findUnique: async () => setup.user } },
    );
    await assert.rejects(
      guard.canActivate(
        context({ headers: { authorization: "Bearer cualquier-token" } }),
      ),
      UnauthorizedException,
    );
  }
});

test("RolesGuard permite rutas sin roles y usuarios con rol autorizado", () => {
  const unrestricted = new RolesGuard({ getAllAndOverride: () => undefined });
  assert.equal(unrestricted.canActivate(context()), true);

  const adminOnly = new RolesGuard({
    getAllAndOverride: () => ["ADMIN"],
  });
  assert.equal(
    adminOnly.canActivate(context({ headers: {}, user: { role: "ADMIN" } })),
    true,
  );
});

test("RolesGuard rechaza usuarios sin el rol requerido", () => {
  const guard = new RolesGuard({ getAllAndOverride: () => ["ADMIN"] });
  assert.throws(
    () =>
      guard.canActivate(context({ headers: {}, user: { role: "VENDEDOR" } })),
    ForbiddenException,
  );
});
