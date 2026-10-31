const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  PASSWORD,
  cleanup,
  createUser,
} = require("../../../../test/datos-de-prueba.cjs");
const { startApi } = require("./api.cjs");

let api;
let user;
let token;
const activityIds = [];
const call = (path, options = {}) => api.call(path, { ...options, token });
const day = (offset) =>
  new Date(Date.now() + offset * 86_400_000).toISOString();

before(async () => {
  api = await startApi();
  user = await createUser(api.prisma, { name: "Responsable de actividades" });
  token = (
    await api.call("/auth/login", {
      method: "POST",
      body: { email: user.email, password: PASSWORD },
    })
  ).body.accessToken;
});

after(async () => {
  if (activityIds.length)
    await api.prisma.activity.deleteMany({
      where: { id: { in: activityIds } },
    });
  await cleanup(api.prisma);
  await api.close();
});

test("ticket-23: CRUD, asignación, próximas/atrasadas y autenticación por HTTP real", async () => {
  assert.equal((await api.call("/activities")).status, 401);
  const overdue = await call("/activities", {
    method: "POST",
    body: {
      type: "CALL",
      subject: "Llamada atrasada",
      dueAt: day(-2),
      assigneeId: user.id,
    },
  });
  assert.equal(overdue.status, 201, JSON.stringify(overdue.body));
  activityIds.push(overdue.body.id);
  assert.equal(overdue.body.assignee.id, user.id);
  const upcoming = await call("/activities", {
    method: "POST",
    body: {
      type: "MEETING",
      subject: "Reunión próxima",
      dueAt: day(2),
      assigneeId: user.id,
    },
  });
  assert.equal(upcoming.status, 201, JSON.stringify(upcoming.body));
  activityIds.push(upcoming.body.id);

  assert.deepEqual(
    (await call("/activities/overdue?type=CALL")).body.data.map(
      (item) => item.id,
    ),
    [overdue.body.id],
  );
  assert.ok(
    (await call("/activities/upcoming?assigneeId=" + user.id)).body.data.some(
      (item) => item.id === upcoming.body.id,
    ),
  );
  assert.equal(
    (await call(`/activities/${overdue.body.id}`)).body.subject,
    "Llamada atrasada",
  );

  const edit = await call(`/activities/${upcoming.body.id}`, {
    method: "PATCH",
    body: { subject: "Reunión reprogramada", type: "MEETING" },
  });
  assert.equal(edit.status, 200);
  assert.equal(edit.body.subject, "Reunión reprogramada");
  const done = await call(`/activities/${upcoming.body.id}/complete`, {
    method: "PATCH",
  });
  assert.equal(done.status, 200);
  assert.equal(done.body.status, "COMPLETED");
  assert.equal(
    (
      await call(`/activities/${upcoming.body.id}/complete`, {
        method: "PATCH",
      })
    ).status,
    409,
  );
  assert.equal(
    (await call(`/activities/${upcoming.body.id}`, { method: "DELETE" }))
      .status,
    204,
  );
  activityIds.splice(activityIds.indexOf(upcoming.body.id), 1);
});

test("ticket-23: dispara un correo de recordatorio y evita volver a enviarlo", async () => {
  const reminderAt = new Date(Date.now() - 60_000);
  const dueAt = new Date(Date.now() + 3_600_000);
  const created = await call("/activities", {
    method: "POST",
    body: {
      type: "TASK",
      subject: "Enviar propuesta",
      dueAt: dueAt.toISOString(),
      reminderAt: new Date(Date.now() + 600_000).toISOString(),
      assigneeId: user.id,
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  activityIds.push(created.body.id);
  const patched = await call(`/activities/${created.body.id}`, {
    method: "PATCH",
    body: { reminderAt: reminderAt.toISOString() },
  });
  assert.equal(patched.status, 200);
  assert.equal(await api.reminders.deliverDueReminders(new Date()), 1);
  assert.equal(
    api.inbox.filter(
      (message) =>
        message.kind === "activity-reminder" &&
        message.subject === "Enviar propuesta",
    ).length,
    1,
  );
  assert.equal(await api.reminders.deliverDueReminders(new Date()), 0);
  const delivered = await call(`/activities/${created.body.id}`);
  assert.ok(delivered.body.reminderSentAt);
});

test("ticket-23: valida fechas de recordatorio y no asigna usuarios inactivos", async () => {
  const invalidDate = await call("/activities", {
    method: "POST",
    body: {
      type: "TASK",
      subject: "Revisar",
      reminderAt: day(1),
      assigneeId: user.id,
    },
  });
  assert.equal(invalidDate.status, 400);
  const inactive = await createUser(api.prisma, {
    name: "Usuario inactivo",
    active: false,
  });
  const invalidOwner = await call("/activities", {
    method: "POST",
    body: { type: "TASK", subject: "Revisar", assigneeId: inactive.id },
  });
  assert.equal(invalidOwner.status, 400);
});
