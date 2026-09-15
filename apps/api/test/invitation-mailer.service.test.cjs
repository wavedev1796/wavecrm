const { test } = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");
const nodemailerApi = nodemailer.default ?? nodemailer;
const { ServiceUnavailableException } = require("@nestjs/common");
const {
  InvitationMailerService,
} = require("../dist/modules/users/invitation-mailer.service.js");

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

  const mailer = new InvitationMailerService(
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
  const mailer = new InvitationMailerService(
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
  const mailer = new InvitationMailerService(
    config({ SMTP_HOST: "smtp.example.com", SMTP_USER: "usuario" }),
  );
  await assert.rejects(
    mailer.sendInvitation({ email: "ana@empresa.ec", name: "Ana" }, "token"),
    ServiceUnavailableException,
  );
});

test("en producción exige una configuración SMTP", async () => {
  const mailer = new InvitationMailerService(
    config({ NODE_ENV: "production" }),
  );
  await assert.rejects(
    mailer.sendInvitation({ email: "ana@empresa.ec", name: "Ana" }, "token"),
    ServiceUnavailableException,
  );
});
