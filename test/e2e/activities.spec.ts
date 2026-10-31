import { expect, test } from "@playwright/test";
import { prisma } from "@wave/database";
import { createUser, login } from "./datos";

let seller: Awaited<ReturnType<typeof createUser>>;
let assignee: Awaited<ReturnType<typeof createUser>>;
let activityId: string | undefined;

test.beforeAll(async () => {
  seller = await createUser({ name: "Creador agenda" });
  assignee = await createUser({ name: "Responsable agenda" });
});

test.afterAll(async () => {
  if (activityId)
    await prisma.activity.deleteMany({ where: { id: activityId } });
  await prisma.user.deleteMany({
    where: { id: { in: [seller?.id, assignee?.id].filter(Boolean) } },
  });
  await prisma.$disconnect();
});

test("ticket-24: crea, filtra, consulta en calendario y completa una actividad real", async ({
  page,
}) => {
  await login(page, seller.email);
  await expect(page).toHaveURL(/\/pipeline$/);
  await page.goto("/actividades");
  await expect(
    page.getByRole("heading", { name: "Agenda del equipo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nueva actividad" }).click();
  await page.getByLabel("Asunto").fill("Revisar propuesta del equipo");
  await page.getByLabel("Tipo de actividad").selectOption("CALL");
  await page.getByLabel("Responsable asignado").selectOption(assignee.id);
  const due = new Date(Date.now() + 86_400_000);
  const local = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(due)
    .replace(" ", "T");
  await page.getByLabel("Vence").fill(local);
  await page.getByRole("button", { name: "Guardar actividad" }).click();
  await expect(page.getByRole("status")).toHaveText("Actividad creada.");
  await expect(
    page.getByRole("heading", { name: "Revisar propuesta del equipo" }),
  ).toBeVisible();
  activityId = (
    await prisma.activity.findFirst({
      where: {
        subject: "Revisar propuesta del equipo",
        assigneeId: assignee.id,
      },
      orderBy: { createdAt: "desc" },
    })
  )?.id;
  expect(activityId).toBeTruthy();

  await page.getByLabel("Filtrar por responsable").selectOption(assignee.id);
  await expect(
    page.getByRole("heading", { name: "Revisar propuesta del equipo" }),
  ).toBeVisible();
  await page.getByLabel("Filtrar por tipo").selectOption("CALL");
  await expect(
    page.getByRole("heading", { name: "Revisar propuesta del equipo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Calendario" }).click();
  await expect(page.getByRole("grid")).toBeVisible();
  await page.getByRole("button", { name: "Lista" }).click();
  await page
    .getByRole("button", {
      name: "Marcar Revisar propuesta del equipo como hecha",
    })
    .click();
  await expect(page.getByText("Completada")).toBeVisible();
  expect(
    (await prisma.activity.findUnique({ where: { id: activityId } }))?.status,
  ).toBe("COMPLETED");
});
