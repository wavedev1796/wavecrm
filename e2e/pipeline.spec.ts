import { expect, test } from "@playwright/test";
import { prisma } from "@wave/database";
import { createUser, login, rucDePrueba } from "./datos";

let seller: Awaited<ReturnType<typeof createUser>>;
let owner: Awaited<ReturnType<typeof createUser>>;
let pipelineId: string;
let companyId: string;
let initialId: string;
let proposalId: string;
test.beforeAll(async () => {
  seller = await createUser({ name: "Vendedor Kanban" });
  owner = await createUser({ name: "Responsable Kanban" });
  const company = await prisma.company.create({
    data: {
      name: "Empresa Kanban " + Date.now(),
      taxId: rucDePrueba(),
      ownerId: seller.id,
    },
  });
  companyId = company.id;
  const pipeline = await prisma.pipeline.create({
    data: {
      name: "Ventas Kanban " + Date.now(),
      stages: {
        create: [
          { name: "Inicial", position: 0, probability: 10, color: "#2f6f8f" },
          { name: "Propuesta", position: 1, probability: 70, color: "#E0B15A" },
          { name: "Ganado", position: 2, probability: 100, color: "#2f8f5b" },
        ],
      },
    },
    include: { stages: true },
  });
  pipelineId = pipeline.id;
  initialId = pipeline.stages.find((s) => s.name === "Inicial")!.id;
  proposalId = pipeline.stages.find((s) => s.name === "Propuesta")!.id;
});
test.afterAll(async () => {
  if (pipelineId) {
    await prisma.deal.deleteMany({ where: { pipelineId } });
    await prisma.pipeline.delete({ where: { id: pipelineId } });
  }
  if (companyId) await prisma.company.delete({ where: { id: companyId } });
  await prisma.user.deleteMany({
    where: { id: { in: [seller?.id, owner?.id].filter(Boolean) } },
  });
  await prisma.$disconnect();
});
test("crea, mueve, edita y elimina un negocio real con controles Wave en escritorio y movil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, seller.email);
  await expect(page).toHaveURL(/\/pipeline$/);
  await page.goto("/pipeline?pipelineId=" + pipelineId);
  await page
    .getByRole("button", { name: "Nuevo negocio", exact: true })
    .click();
  const modal = page.getByRole("dialog", { name: "Crear nuevo negocio" });
  await modal
    .getByRole("button", { name: "Crear negocio", exact: true })
    .click();
  await expect(modal.getByText(/Ingresa el nombre del negocio/)).toBeVisible();
  await modal.getByLabel("Nombre del negocio").fill("Oportunidad Kanban");
  await modal.getByLabel("Monto (USD)").fill("520.25");
  await modal.getByLabel("Empresa", { exact: true }).selectOption(companyId);
  await modal.getByLabel("Responsable", { exact: true }).selectOption(owner.id);
  await modal.getByLabel("Fecha estimada de cierre").fill("2026-10-22");
  for (const label of [
    "Pipeline",
    "Etapa",
    "Contacto",
    "Empresa",
    "Responsable",
    "Estado",
  ])
    await expect(modal.getByLabel(label, { exact: true })).toHaveClass(
      /select-control/,
    );
  await page.screenshot({
    path: "test-results/pipeline-form-desktop.png",
    fullPage: true,
  });
  await modal
    .getByRole("button", { name: "Crear negocio", exact: true })
    .click();
  await expect(modal).not.toBeVisible();
  const card = page.getByRole("article", {
    name: "Negocio Oportunidad Kanban",
  });
  await expect(card).toBeVisible();
  await expect(card).toContainText("520,25");
  await expect(card).toContainText("22 oct");
  await expect(card).toContainText(owner.name);
  const saved = await prisma.deal.findFirstOrThrow({
    where: { pipelineId, title: "Oportunidad Kanban" },
  });
  expect(saved.stageId).toBe(initialId);
  await card.dragTo(page.getByRole("region", { name: "Etapa Propuesta" }));
  await expect(
    page.getByRole("region", { name: "Etapa Propuesta" }).getByRole("article"),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        (await prisma.deal.findUniqueOrThrow({ where: { id: saved.id } }))
          .stageId,
    )
    .toBe(proposalId);
  await card.getByRole("button", { name: "Historial", exact: true }).click();
  const history = page.getByRole("dialog", { name: "Historial del negocio" });
  await expect(history).toContainText("Inicial → Propuesta");
  await history.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.screenshot({
    path: "test-results/pipeline-board-desktop.png",
    fullPage: true,
  });
  await card.getByRole("button", { name: "Editar", exact: true }).click();
  const edit = page.getByRole("dialog", {
    name: "Editar negocio",
    exact: true,
  });
  await edit.getByLabel("Monto (USD)").fill("600.75");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    edit.getByRole("button", { name: "Guardar cambios" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/pipeline-form-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await edit.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(edit).not.toBeVisible();
  await expect(card).toContainText("600,75");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await card
    .getByLabel("Mover Oportunidad Kanban de etapa")
    .selectOption(initialId);
  await expect(
    page.getByRole("region", { name: "Etapa Inicial" }).getByRole("article"),
  ).toBeVisible();
  await card
    .getByRole("button", { name: "Eliminar Oportunidad Kanban" })
    .click();
  await page
    .getByRole("dialog", { name: "Eliminar negocio" })
    .getByRole("button", { name: "Eliminar negocio", exact: true })
    .click();
  await expect(card).not.toBeVisible();
  expect(await prisma.deal.findUnique({ where: { id: saved.id } })).toBeNull();
});
test("configura una etapa desde el tablero con los mismos selectores", async ({
  page,
}) => {
  await login(page, seller.email);
  await expect(page).toHaveURL(/\/pipeline$/);
  await page.goto("/pipeline?pipelineId=" + pipelineId);
  await page.getByRole("button", { name: "Configurar pipeline" }).click();
  const modal = page.getByRole("dialog", { name: "Configurar pipeline" });
  await modal.getByLabel("Nombre de etapa").fill("Seguimiento");
  await modal.getByLabel("Probabilidad (%)").fill("55");
  await modal.getByLabel("Color", { exact: true }).selectOption("#6F9FD8");
  await modal
    .getByRole("button", { name: "Agregar etapa", exact: true })
    .click();
  await expect(modal).not.toBeVisible();
  await expect(
    page.getByRole("region", { name: "Etapa Seguimiento" }),
  ).toContainText("55% probabilidad");
});
