const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
} = require("@nestjs/common");
const {
  ActivitiesService,
} = require("../../../dist/modules/activities/activities.service.js");
const {
  ActivityRemindersService,
} = require("../../../dist/modules/activities/activity-reminders.service.js");
const { plainToInstance } = require("class-transformer");
const {
  CreateActivityDto,
} = require("../../../dist/modules/activities/activities.dto.js");

const base = {
  id: "activity-1",
  type: "CALL",
  status: "PENDING",
  subject: "Llamar",
  dueAt: new Date("2026-11-05T15:00:00Z"),
  updatedAt: new Date("2026-11-03T12:00:00.000Z"),
  reminderAt: null,
  assigneeId: "user-1",
  assignee: { id: "user-1", name: "Ana", email: "ana@example.test" },
};
function prismaFor(initial = base) {
  // Copia: completar o cancelar cambian la fila y no deben tocar `base`.
  const activity = initial && { ...initial };
  const prisma = {
    audit: [],
    activity: {
      findMany: async () => (activity ? [activity] : []),
      count: async ({ where }) => (where.dueAt ? 1 : 4),
      findUnique: async () => activity,
      findUniqueOrThrow: async () => activity,
      findFirst: async () => ({ id: "user-1" }),
      create: async ({ data }) => ({ ...base, ...data }),
      update: async ({ data }) => ({ ...base, ...data }),
      // Como la base: solo escribe si la fila existe y sigue en el estado del where.
      updateMany: async ({ where, data }) =>
        !activity ||
        (where.status && activity.status !== where.status) ||
        (where.updatedAt && activity.updatedAt?.getTime() !== where.updatedAt.getTime())
          ? { count: 0 }
          : (Object.assign(activity, data), { count: 1 }),
      delete: async () => activity,
    },
    auditLog: {
      create: async ({ data }) => (prisma.audit.push(data), data),
    },
    user: { findFirst: async () => ({ id: "user-1" }) },
    contact: { findUnique: async () => ({ id: "contact-1" }) },
    company: { findUnique: async () => ({ id: "company-1" }) },
    deal: { findUnique: async () => ({ status: "OPEN" }) },
  };
  prisma.$transaction = async (work) =>
    typeof work === "function" ? work(prisma) : Promise.all(work);
  return prisma;
}

test("activities list supports type, assignee, upcoming and overdue filters", async () => {
  const prisma = prismaFor();
  let args;
  prisma.activity.findMany = async (received) => ((args = received), [base]);
  const result = await new ActivitiesService(prisma).list({
    type: "CALL",
    assigneeId: "user-1",
    period: "overdue",
  });
  assert.equal(args.where.type, "CALL");
  assert.equal(args.where.assigneeId, "user-1");
  assert.equal(args.where.status, "PENDING");
  assert.ok(args.where.dueAt.lt instanceof Date);
  assert.equal(result.meta.total, 1);
});

test("P14: la agenda filtra por negocio cuando llega desde su ficha", async () => {
  const prisma = prismaFor();
  let args;
  prisma.activity.findMany = async (received) => ((args = received), [base]);
  await new ActivitiesService(prisma).list({ dealId: "deal-1" });
  assert.equal(args.where.dealId, "deal-1");
  await new ActivitiesService(prisma).list({});
  assert.equal("dealId" in args.where, false);
});

test("activity create assigns actor by default and validates an active assignee", async () => {
  const prisma = prismaFor();
  let inserted;
  prisma.activity.create = async ({ data }) => (
    (inserted = data),
    { ...base, ...data }
  );
  const result = await new ActivitiesService(prisma).create(
    { type: "CALL", subject: "Llamar", dueAt: base.dueAt },
    "user-1",
  );
  assert.equal(inserted.assigneeId, "user-1");
  assert.equal(inserted.createdById, "user-1");
  assert.equal(result.subject, "Llamar");
  prisma.user.findFirst = async () => null;
  await assert.rejects(
    new ActivitiesService(prisma).create(
      { type: "CALL", subject: "Llamar", assigneeId: "user-2" },
      "user-1",
    ),
    BadRequestException,
  );
});

test("reminder must have a due date and precede it", async () => {
  const service = new ActivitiesService(prismaFor());
  await assert.rejects(
    service.create(
      { type: "TASK", subject: "Tarea", reminderAt: new Date() },
      "user-1",
    ),
    BadRequestException,
  );
  await assert.rejects(
    service.create(
      {
        type: "TASK",
        subject: "Tarea",
        dueAt: new Date("2026-11-05"),
        reminderAt: new Date("2026-11-06"),
      },
      "user-1",
    ),
    BadRequestException,
  );
});

test("rescheduling or reassigning resets a previously delivered reminder", async () => {
  const prisma = prismaFor({
    ...base,
    reminderAt: new Date("2026-11-05T14:00:00Z"),
    reminderSentAt: new Date("2026-11-05T14:00:00Z"),
  });
  let update;
  const write = prisma.activity.updateMany;
  prisma.activity.updateMany = async (args) => ((update = args), write(args));
  await new ActivitiesService(prisma).update(
    "activity-1",
    { dueAt: new Date("2026-11-06T15:00:00Z") },
    "user-2",
  );
  assert.equal(update.where.status, "PENDING");
  assert.equal(update.data.reminderSentAt, null);
  assert.equal(update.data.reminderClaimedAt, null);
  // CRM-22: reprogramar deja quién, y la fecha anterior y la nueva.
  assert.deepEqual(prisma.audit[0], {
    action: "UPDATED",
    entityType: "Activity",
    entityId: "activity-1",
    userId: "user-2",
    changes: {
      dueAt: { from: "2026-11-05T15:00:00.000Z", to: "2026-11-06T15:00:00.000Z" },
    },
  });
});

test("editar con una versión obsoleta responde 409 sin crear una auditoría", async () => {
  const prisma = prismaFor({ ...base, subject: "Asunto actualizado" });
  await assert.rejects(
    new ActivitiesService(prisma).update(
      "activity-1",
      { subject: "Cambio antiguo", updatedAt: new Date("2026-11-03T11:00:00.000Z") },
      "user-2",
    ),
    (error) => error instanceof ConflictException && /cambió desde que la abriste/.test(error.message),
  );
  assert.equal(prisma.audit.length, 0);
});

test("una edición válida avanza updatedAt al menos un milisegundo", async () => {
  const prisma = prismaFor();
  let write;
  const updateMany = prisma.activity.updateMany;
  prisma.activity.updateMany = async (args) => ((write = args), updateMany(args));
  await new ActivitiesService(prisma).update(
    "activity-1",
    { subject: "Nueva versión", updatedAt: base.updatedAt },
    "user-2",
  );
  assert.equal(write.where.updatedAt.getTime(), base.updatedAt.getTime());
  assert.ok(write.data.updatedAt.getTime() > base.updatedAt.getTime());
});

test("CRM-22: quitar el vencimiento con recordatorio no se valida contra la fecha anterior", async () => {
  const prisma = prismaFor({ ...base, reminderAt: new Date("2026-11-05T14:00:00Z") });
  await assert.rejects(
    new ActivitiesService(prisma).update("activity-1", { dueAt: null }, "user-1"),
    BadRequestException,
  );
});

test("complete is one-way and delete/find return a 404 for absent activity", async () => {
  const prisma = prismaFor();
  const result = await new ActivitiesService(prisma).complete("activity-1", "user-1");
  assert.equal(result.status, "COMPLETED");
  assert.ok(result.completedAt instanceof Date);
  assert.deepEqual(
    [prisma.audit[0].action, prisma.audit[0].userId],
    ["COMPLETED", "user-1"],
  );
  // Un segundo clic (o alguien más) ya no la encuentra pendiente.
  await assert.rejects(
    new ActivitiesService(prisma).complete("activity-1", "user-1"),
    ConflictException,
  );
  const service = new ActivitiesService(prismaFor(null));
  await assert.rejects(service.findOne("missing"), NotFoundException);
  await assert.rejects(service.complete("missing", "user-1"), NotFoundException);
  await assert.rejects(service.remove("missing", "user-1"), NotFoundException);
});

test("CRM-22: cancelar conserva la actividad, deja la traza y no se repite", async () => {
  const prisma = prismaFor({ ...base, reminderClaimedAt: new Date() });
  const service = new ActivitiesService(prisma);
  const result = await service.cancel("activity-1", "user-2");
  assert.equal(result.status, "CANCELLED");
  assert.equal(result.reminderClaimedAt, null);
  assert.deepEqual(
    [prisma.audit[0].action, prisma.audit[0].userId],
    ["CANCELLED", "user-2"],
  );
  await assert.rejects(service.cancel("activity-1", "user-2"), ConflictException);
  await assert.rejects(
    service.update("activity-1", { subject: "Otra" }, "user-2"),
    ConflictException,
  );
});

test("CRM-22: eliminar guarda en la auditoría qué era y quién la borró", async () => {
  const prisma = prismaFor({ ...base, dealId: "deal-1", contactId: null, companyId: null });
  await new ActivitiesService(prisma).remove("activity-1", "user-2");
  assert.deepEqual(prisma.audit[0], {
    action: "DELETED",
    entityType: "Activity",
    entityId: "activity-1",
    userId: "user-2",
    changes: {
      type: "CALL",
      subject: "Llamar",
      status: "PENDING",
      dueAt: "2026-11-05T15:00:00.000Z",
      dealId: "deal-1",
      contactId: null,
      companyId: null,
    },
  });
});

test("CRM-22: un negocio rechazado no recibe actividades nuevas desde la agenda", async () => {
  const prisma = prismaFor();
  prisma.deal.findUnique = async () => ({ status: "REJECTED" });
  await assert.rejects(
    new ActivitiesService(prisma).create(
      { type: "CALL", subject: "Llamar", dealId: "deal-1" },
      "user-1",
    ),
    ConflictException,
  );
});

test("CRM-22: un día sin hora es las 00:00 de Ecuador; con hora se respeta el instante", () => {
  const dto = (dueAt) =>
    plainToInstance(CreateActivityDto, { type: "CALL", subject: "Llamar", dueAt }).dueAt;
  assert.equal(dto("2026-11-05").toISOString(), "2026-11-05T05:00:00.000Z");
  assert.equal(
    dto("2026-11-05T20:00:00-05:00").toISOString(),
    "2026-11-06T01:00:00.000Z",
  );
  assert.equal(dto("luego"), "luego");
});

test("reminder runner sends once and marks the activity delivered", async () => {
  let sent = 0;
  let claims = 0;
  const prisma = prismaFor();
  prisma.activity.findMany = async () => [
    {
      ...base,
      reminderAt: new Date("2026-11-05T14:30:00Z"),
      assignee: base.assignee,
    },
  ];
  prisma.activity.updateMany = async () => ((claims += 1), { count: 1 });
  const worker = new ActivityRemindersService(prisma, {
    sendActivityReminder: async () => {
      sent += 1;
    },
  });
  assert.equal(
    await worker.deliverDueReminders(new Date("2026-11-05T14:30:00Z")),
    1,
  );
  assert.equal(sent, 1);
  assert.equal(claims, 1);
});
