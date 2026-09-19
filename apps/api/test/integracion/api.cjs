// Levanta el API real (AppModule + configureApp) contra la rama "pruebas" de Neon.
// Solo se sustituye el correo: las invitaciones quedan en `inbox` en vez de enviarse.
const { Test } = require("@nestjs/testing");
const { assertTestDatabase } = require("../../../../test/datos-de-prueba.cjs");
const { AppModule } = require("../../dist/app.module.js");
const { configureApp } = require("../../dist/app.setup.js");
const { PrismaService } = require("../../dist/modules/prisma/prisma.service.js");
const { InvitationMailerService } = require("../../dist/modules/users/invitation-mailer.service.js");

async function startApi() {
  assertTestDatabase();
  const inbox = [];
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(InvitationMailerService)
    .useValue({
      sendInvitation: async (recipient, token) => {
        inbox.push({ ...recipient, token });
      },
    })
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;

  /** Llama al API y devuelve estado, cabeceras y cuerpo JSON (o null si no hay cuerpo). */
  async function call(path, { method = "GET", body, token, headers = {} } = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: body === undefined || typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null };
  }

  return { call, inbox, prisma: app.get(PrismaService), close: () => app.close() };
}

module.exports = { startApi };
