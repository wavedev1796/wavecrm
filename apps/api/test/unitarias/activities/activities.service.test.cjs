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

const base = {
  id: "activity-1",
  type: "CALL",
  status: "PENDING",
  subject: "Llamar",
  dueAt: new Date("2026-11-05T15:00:00Z"),
  reminderAt: null,
  assigneeId: "user-1",
  assignee: { id: "user-1", name: "Ana", email: "ana@example.test" },
};
function prismaFor(activity = base) {
  return {
    activity: {
      findMany: async () => (activity ? [activity] : []),
      count: async ({ where }) => (where.dueAt ? 1 : 4),
      findUnique: async () => activity,
      findFirst: async () => ({ id: "user-1" }),
      create: async ({ data }) => ({ ...base, ...data }),
      update: async ({ data }) => ({ ...base, ...data }),
      updateMany: async () => ({ count: 1 }),
      delete: async () => activity,
    },
    user: { findFirst: async () => ({ id: "user-1" }) },
    contact: { findUnique: async () => ({ id: "contact-1" }) },
    company: { findUnique: async () => ({ id: "company-1" }) },
    deal: { findUnique: async () => ({ id: "deal-1" }) },
    $transaction: async (queries) => Promise.all(queries),
  };
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
  prisma.activity.update = async (args) => (
    (update = args),
    { ...base, ...args.data }
  );
  await new ActivitiesService(prisma).update("activity-1", {
    dueAt: new Date("2026-11-06T15:00:00Z"),
  });
  assert.equal(update.data.reminderSentAt, null);
  assert.equal(update.data.reminderClaimedAt, null);
});

test("complete is one-way and delete/find return a 404 for absent activity", async () => {
  const prisma = prismaFor();
  const result = await new ActivitiesService(prisma).complete("activity-1");
  assert.equal(result.status, "COMPLETED");
  assert.ok(result.completedAt instanceof Date);
  prisma.activity.findUnique = async () => null;
  const service = new ActivitiesService(prisma);
  await assert.rejects(service.findOne("missing"), NotFoundException);
  await assert.rejects(service.complete("missing"), NotFoundException);
  await assert.rejects(service.remove("missing"), NotFoundException);
  prisma.activity.findUnique = async () => ({ ...base, status: "COMPLETED" });
  await assert.rejects(service.complete("activity-1"), ConflictException);
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
