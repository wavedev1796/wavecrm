const { test } = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");
const nodemailerApi = nodemailer.default ?? nodemailer;
const { ServiceUnavailableException } = require("@nestjs/common");
const {
  MailerService,
} = require("../../../dist/modules/mailer/mailer.service.js");

function config(values) {
  return { get: (key) => values[key] };
}

test("envía la invitación mediante SMTP con texto y HTML", async (t) => {
  let transportOptions;
  let message;
  const originalCreateTransport = nodemailerApi.createTransport;
  nodemailerApi.createTransport = (options) => {
    transportOptions = options;
    return {
      sendMail: async (value) => {
        message = value;
      },
    };
  };
  t.after(() => {
    nodemailerApi.createTransport = originalCreateTransport;
  });

  const mailer = new MailerService(
    config({
      APP_URL: "http://localhost:3000/",
      SMTP_HOST: "localhost",
      SMTP_PORT: "1025",
      SMTP_SECURE: "false",
      EMAIL_FROM: "Wave CRM <no-reply@localhost>",
    }),
  );
  await mailer.sendInvitation(
    { email: "ana@empresa.ec", name: "Ana <López>" },
    "token seguro",
  );

  assert.equal(transportOptions.host, "localhost");
  assert.equal(transportOptions.port, 1025);
  assert.equal(transportOptions.secure, false);
  assert.equal(transportOptions.auth, undefined);
  assert.equal(message.to, "ana@empresa.ec");
  assert.match(message.text, /token%20seguro/);
  assert.match(message.html, /Ana &lt;López&gt;/);
  assert.doesNotMatch(message.html, /Ana <López>/);
});

test("acepta autenticación SMTP completa", async (t) => {
  let transportOptions;
  const originalCreateTransport = nodemailerApi.createTransport;
  nodemailerApi.createTransport = (options) => {
    transportOptions = options;
    return { sendMail: async () => ({}) };
  };
  t.after(() => {
    nodemailerApi.createTransport = originalCreateTransport;
  });
  const mailer = new MailerService(
    config({
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "465",
      SMTP_SECURE: "true",
      SMTP_USER: "usuario",
      SMTP_PASS: "secreto",
    }),
  );
  await mailer.sendInvitation(
    { email: "ana@empresa.ec", name: "Ana" },
    "token",
  );
  assert.deepEqual(transportOptions.auth, {
    user: "usuario",
    pass: "secreto",
  });
  assert.equal(transportOptions.secure, true);
});

test("rechaza una autenticación SMTP incompleta", async () => {
  const mailer = new MailerService(
    config({ SMTP_HOST: "smtp.example.com", SMTP_USER: "usuario" }),
  );
  await assert.rejects(
    mailer.sendInvitation({ email: "ana@empresa.ec", name: "Ana" }, "token"),
    ServiceUnavailableException,
  );
});

test("en producción exige una configuración SMTP", async () => {
  const mailer = new MailerService(
    config({ NODE_ENV: "production" }),
  );
  await assert.rejects(
    mailer.sendInvitation({ email: "ana@empresa.ec", name: "Ana" }, "token"),
    ServiceUnavailableException,
  );
});

function withTransport(t, sendMail) {
  let options;
  const original = nodemailerApi.createTransport;
  nodemailerApi.createTransport = (value) => {
    options = value;
    return { sendMail };
  };
  t.after(() => {
    nodemailerApi.createTransport = original;
  });
  return () => options;
}

test("sin SMTP fuera de producción, el enlace de recuperación se escribe en consola", async (t) => {
  const logged = [];
  t.mock.method(console, "info", (line) => logged.push(line));
  await new MailerService(config({})).sendPasswordReset(
    { email: "ana@empresa.ec", name: "Ana" },
    "abc",
  );
  assert.deepEqual(logged, [
    "[Wave CRM] Recupera tu contraseña de Wave CRM · ana@empresa.ec: http://localhost:3000/restablecer-contrasena?token=abc",
  ]);
});

test("el recordatorio llega al responsable, abre la agenda y escapa el asunto", async (t) => {
  let message;
  withTransport(t, async (value) => { message = value; });
  const mailer = new MailerService(config({ APP_URL: "https://crm.example/", SMTP_HOST: "smtp.example.com" }));
  await mailer.sendActivityReminder({ email: "ana@empresa.ec", name: "Ana" }, "Oferta < urgente", new Date("2026-11-05T15:00:00.000Z"));
  assert.equal(message.to, "ana@empresa.ec");
  assert.match(message.subject, /Oferta < urgente/);
  assert.match(message.text, /\/actividades/);
  assert.match(message.html, /Oferta &lt; urgente/);
  assert.doesNotMatch(message.html, /Oferta < urgente/);
});

test("el puerto 587 por defecto no usa TLS directo y un fallo de envío responde 503", async (t) => {
  const options = withTransport(t, async () => {
    throw new Error("ECONNREFUSED");
  });
  await assert.rejects(
    new MailerService(config({ SMTP_HOST: "smtp.example.com" })).sendPasswordReset(
      { email: "ana@empresa.ec", name: "Ana" },
      "token",
    ),
    (error) => error instanceof ServiceUnavailableException && error.message === "No se pudo enviar el correo.",
  );
  assert.equal(options().port, 587);
  assert.equal(options().secure, false);
});

test("un puerto o SMTP_SECURE inválidos se rechazan antes de conectar", async () => {
  for (const [values, message] of [
    [{ SMTP_PORT: "70000" }, "El puerto SMTP no es válido."],
    [{ SMTP_PORT: "abc" }, "El puerto SMTP no es válido."],
    [{ SMTP_SECURE: "sí" }, "SMTP_SECURE debe ser true o false."],
  ]) {
    await assert.rejects(
      new MailerService(config({ SMTP_HOST: "smtp.example.com", ...values })).sendInvitation(
        { email: "ana@empresa.ec", name: "Ana" },
        "token",
      ),
      (error) => error instanceof ServiceUnavailableException && error.message === message,
    );
  }
});

test("SMTP_SECURE vacío decide por el puerto y el HTML escapa comillas y &", async (t) => {
  let message;
  const options = withTransport(t, async (value) => {
    message = value;
  });
  await new MailerService(
    config({ SMTP_HOST: "smtp.example.com", SMTP_PORT: "465", SMTP_SECURE: "" }),
  ).sendInvitation({ email: "ana@empresa.ec", name: `O'Neil & "Ana"` }, "token");
  assert.equal(options().secure, true);
  assert.match(message.html, /O&#39;Neil &amp; &quot;Ana&quot;/);
  assert.equal(message.from, "Wave CRM <no-reply@example.com>");
});
