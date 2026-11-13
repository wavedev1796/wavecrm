const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  PASSWORD,
  cleanup,
  createUser,
  pasaporteDePrueba,
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

test("CRM-4: una edición obsoleta devuelve 409 y conserva la última versión", async () => {
  const created = await call("/activities", {
    method: "POST",
    body: { type: "TASK", subject: "Versión inicial" },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  activityIds.push(created.body.id);
  const firstVersion = created.body.updatedAt;
  const current = await call(`/activities/${created.body.id}`, {
    method: "PATCH",
    body: { subject: "Versión vigente", updatedAt: firstVersion },
  });
  assert.equal(current.status, 200, JSON.stringify(current.body));
  assert.ok(new Date(current.body.updatedAt).getTime() > new Date(firstVersion).getTime());
  const stale = await call(`/activities/${created.body.id}`, {
    method: "PATCH",
    body: { subject: "Versión obsoleta", updatedAt: firstVersion },
  });
  assert.equal(stale.status, 409, JSON.stringify(stale.body));
  assert.match(stale.body.error.message, /cambió desde que la abriste/);
  assert.equal((await call(`/activities/${created.body.id}`)).body.subject, "Versión vigente");
});

test("REV-B03: borrar negocio, contacto o empresa conserva y desvincula la actividad", async () => {
  const pipeline = await api.prisma.pipeline.findFirst({ include: { stages: true } });
  assert.ok(pipeline?.stages[0], "La base de pruebas debe tener el pipeline de seed.");
  const suffix = Date.now();
  let company;
  let contact;
  let deal;
  let activity;
  try {
    company = await api.prisma.company.create({
      data: { name: "Empresa retención " + suffix, ownerId: user.id },
    });
    contact = await api.prisma.contact.create({
      data: {
        firstName: "Contacto",
        lastName: "Retención",
        documentType: "PASAPORTE",
        documentId: pasaporteDePrueba(),
        email: `retencion-${suffix}@example.test`,
        ownerId: user.id,
        companyId: company.id,
      },
    });
    deal = await api.prisma.deal.create({
      data: {
        title: "Negocio retención " + suffix,
        value: 0,
        pipelineId: pipeline.id,
        stageId: pipeline.stages[0].id,
        ownerId: user.id,
        companyId: company.id,
        contactId: contact.id,
      },
    });
    activity = await api.prisma.activity.create({
      data: {
        type: "TASK",
        subject: "Actividad conservada",
        assigneeId: user.id,
        createdById: user.id,
        companyId: company.id,
        contactId: contact.id,
        dealId: deal.id,
      },
    });
    activityIds.push(activity.id);
    await api.prisma.deal.delete({ where: { id: deal.id } });
    let retained = await api.prisma.activity.findUnique({ where: { id: activity.id } });
    assert.ok(retained);
    assert.equal(retained.dealId, null);
    assert.equal(retained.contactId, contact.id);
    await api.prisma.contact.delete({ where: { id: contact.id } });
    retained = await api.prisma.activity.findUnique({ where: { id: activity.id } });
    assert.ok(retained);
    assert.equal(retained.contactId, null);
    assert.equal(retained.companyId, company.id);
    await api.prisma.company.delete({ where: { id: company.id } });
    retained = await api.prisma.activity.findUnique({ where: { id: activity.id } });
    assert.ok(retained);
    assert.equal(retained.companyId, null);
  } finally {
    if (activity) {
      await api.prisma.activity.deleteMany({ where: { id: activity.id } });
      activityIds.splice(activityIds.indexOf(activity.id), 1);
    }
    if (deal) await api.prisma.deal.deleteMany({ where: { id: deal.id } });
    if (contact) await api.prisma.contact.deleteMany({ where: { id: contact.id } });
    if (company) await api.prisma.company.deleteMany({ where: { id: company.id } });
    // Limpia el registro aislado que dejó una ejecución anterior si el contacto no llegó a crearse.
    if (!contact)
      await api.prisma.company.deleteMany({
        where: { ownerId: user.id, name: { startsWith: "Empresa retención " } },
      });
  }
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

test("CRM-22: día de Ecuador, cancelar sin borrar y traza de quién cambió qué", async () => {
  const created = await call("/activities", {
    method: "POST",
    body: { type: "TASK", subject: "Enviar contrato", dueAt: "2999-03-10" },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  activityIds.push(created.body.id);
  assert.equal(created.body.dueAt, "2999-03-10T05:00:00.000Z");
  const moved = await call(`/activities/${created.body.id}`, {
    method: "PATCH",
    body: { dueAt: "2999-03-11" },
  });
  assert.equal(moved.body.dueAt, "2999-03-11T05:00:00.000Z");
  const cancelled = await call(`/activities/${created.body.id}/cancel`, {
    method: "PATCH",
  });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.status, "CANCELLED");
  for (const action of ["cancel", "complete"])
    assert.equal(
      (await call(`/activities/${created.body.id}/${action}`, { method: "PATCH" }))
        .status,
      409,
    );
  assert.equal(
    (await call(`/activities/c${"0".repeat(24)}/cancel`, { method: "PATCH" }))
      .status,
    404,
  );
  const trail = await api.prisma.auditLog.findMany({
    where: { entityType: "Activity", entityId: created.body.id },
    orderBy: { createdAt: "asc" },
  });
  assert.deepEqual(
    trail.map((entry) => [entry.action, entry.userId]),
    [
      ["UPDATED", user.id],
      ["CANCELLED", user.id],
    ],
  );
  assert.deepEqual(trail[0].changes, {
    dueAt: { from: "2999-03-10T05:00:00.000Z", to: "2999-03-11T05:00:00.000Z" },
  });
  assert.deepEqual(trail[1].changes, { status: { from: "PENDING", to: "CANCELLED" } });
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
