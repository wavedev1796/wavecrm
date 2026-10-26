import { expect, test } from "@playwright/test";
import { prisma } from "@wave/database";
import { cedulaDePrueba, createUser, login, rucDePrueba } from "./datos";

let seller: Awaited<ReturnType<typeof createUser>>;
let owner: Awaited<ReturnType<typeof createUser>>;
let admin: Awaited<ReturnType<typeof createUser>>;
let gatedPipelineId: string;
let journeyPipelineId: string;
let contactId: string;
let pipelineId: string;
let companyId: string;
let initialId: string;
let proposalId: string;
test.beforeAll(async () => {
  seller = await createUser({ name: "Vendedor Kanban" });
  owner = await createUser({ name: "Responsable Kanban" });
  admin = await createUser({ name: "Admin Kanban", role: "ADMIN" });
  const company = await prisma.company.create({
    data: {
      name: "Empresa Kanban " + Date.now(),
      taxId: rucDePrueba(),
      ownerId: seller.id,
    },
  });
  companyId = company.id;
  const contact = await prisma.contact.create({
    data: {
      firstName: "Ana",
      lastName: "Kanban " + Date.now(),
      email: "ana.kanban." + Date.now() + "@pruebas.example.com",
      documentType: "CEDULA",
      documentId: cedulaDePrueba(),
      companyId,
      ownerId: seller.id,
    },
  });
  contactId = contact.id;
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
  for (const id of [pipelineId, gatedPipelineId, journeyPipelineId].filter(Boolean)) {
    const deals = await prisma.deal.findMany({ where: { pipelineId: id }, select: { id: true } });
    await prisma.auditLog.deleteMany({
      where: { entityType: "Deal", entityId: { in: deals.map((d) => d.id) } },
    });
    await prisma.deal.deleteMany({ where: { pipelineId: id } });
    await prisma.pipeline.delete({ where: { id } });
  }
  if (contactId) await prisma.contact.delete({ where: { id: contactId } });
  if (companyId) await prisma.company.delete({ where: { id: companyId } });
  await prisma.user.deleteMany({
    where: { id: { in: [seller?.id, owner?.id, admin?.id].filter(Boolean) } },
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
  // Sin requisitos en la etapa, el modal de transición no pide nada y mueve directo.
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
  // Retroceder pide el motivo en el mismo modal.
  const back = page.getByRole("dialog", { name: "Cambiar de etapa" });
  await back.getByLabel("Motivo del cambio").fill("El cliente pidió revisar");
  await back.getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(back).not.toBeVisible();
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

test("la ficha arma productos, registra y acepta la propuesta, gana, y solo un ADMIN reabre", async ({ page, browser }) => {
  const deal = await prisma.deal.create({
    data: { title: "Ficha Kanban", value: 50, pipelineId, stageId: proposalId, companyId, ownerId: seller.id },
  });
  await prisma.dealStageHistory.create({ data: { dealId: deal.id, toStageId: proposalId, changedById: seller.id } });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, seller.email);
  await expect(page).toHaveURL(/\/pipeline$/);
  await page.goto("/pipeline/" + deal.id);
  await expect(page.getByRole("heading", { name: "Ficha Kanban" })).toBeVisible();
  await page.getByRole("button", { name: "Agregar producto" }).click();
  await page.getByRole("button", { name: "Agregar producto" }).click();
  await page.getByLabel("Descripción del producto 1").fill("Paquete de chocolates");
  await page.getByLabel("Cantidad del producto 1").fill("2");
  await page.getByLabel("Precio unitario del producto 1").fill("10");
  await page.getByLabel("IVA del producto 1").fill("0");
  await page.getByLabel("Descripción del producto 2").fill("Paquete de vinos");
  await page.getByLabel("Cantidad del producto 2").fill("1");
  await page.getByLabel("Precio unitario del producto 2").fill("100");
  await page.getByLabel("IVA del producto 2").fill("12");
  await page.getByRole("button", { name: "Guardar productos" }).click();
  await expect(page.getByText("Productos guardados.")).toBeVisible();
  await expect(page.getByTestId("deal-total")).toContainText("132,00");
  await expect(page.locator(".deal-profile")).toContainText("120,00");
  await page.getByLabel("Asunto").fill("Llamar para confirmar");
  await page.getByRole("button", { name: "Registrar actividad" }).click();
  await expect(page.getByText("Llamada · Llamar para confirmar")).toBeVisible();

  // Ganar sin propuesta aceptada: el modal lo explica y manda a la ficha.
  await page.getByRole("button", { name: "Ganar", exact: true }).click();
  const blocked = page.getByRole("dialog", { name: "Ganar negocio" });
  await expect(blocked).toContainText("Registra la aceptación de la propuesta con su evidencia.");
  await blocked.getByRole("button", { name: "Cancelar" }).click();

  const nextMonth = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  await page.getByLabel("Vigente hasta").fill(nextMonth);
  await page.getByRole("button", { name: "Registrar propuesta" }).click();
  await expect(page.getByText("Propuesta registrada.")).toBeVisible();
  await page.getByLabel("Evidencia de aceptación").fill("Orden de compra 55 por correo");
  await page.getByRole("button", { name: "Marcar aceptada" }).click();
  await expect(page.getByRole("row", { name: /COT-\d{6}.*Aceptada/ })).toBeVisible();
  await page.screenshot({ path: "test-results/deal-detail-desktop.png", fullPage: true });

  await page.getByRole("button", { name: "Ganar", exact: true }).click();
  const win = page.getByRole("dialog", { name: "Ganar negocio" });
  await expect(win.getByLabel("Fecha real de cierre")).toBeVisible();
  await win.getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(page.getByText(/COT-\d{6} · Aceptada/)).toBeVisible();
  expect(await prisma.quote.count({ where: { dealId: deal.id } })).toBe(1);
  await expect(page.getByRole("button", { name: "Reabrir", exact: true })).toHaveCount(0);

  const adminPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await login(adminPage, admin.email);
  await expect(adminPage).toHaveURL(/\/pipeline$/);
  await adminPage.goto("/pipeline/" + deal.id);
  await adminPage.getByRole("button", { name: "Reabrir", exact: true }).click();
  const reopen = adminPage.getByRole("dialog", { name: "Reabrir negocio" });
  await reopen.getByLabel("Motivo del cambio").fill("El cliente anuló la orden");
  await reopen.getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(adminPage.getByRole("button", { name: "Perder", exact: true })).toBeVisible();
  await expect(adminPage.getByText("Motivo: El cliente anuló la orden").first()).toBeVisible();
  expect(await prisma.quote.count({ where: { dealId: deal.id } })).toBe(1);
  await adminPage.getByRole("button", { name: "Perder", exact: true }).click();
  const lose = adminPage.getByRole("dialog", { name: "Perder negocio" });
  await lose.getByLabel("Motivo de la pérdida").selectOption("NEGOTIATION");
  await lose.getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(adminPage.getByText("Perdido el")).toBeVisible();
  await expect(adminPage.getByText("Perdido · Problemas de negociación")).toBeVisible();
  await adminPage.setViewportSize({ width: 390, height: 844 });
  await adminPage.screenshot({ path: "test-results/deal-detail-mobile.png", fullPage: true });
  expect(await adminPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await adminPage.close();
});

test("el tablero pide los requisitos en el modal, pagina las columnas y pierde en su columna", async ({ page }) => {
  const pipeline = await prisma.pipeline.create({
    data: {
      name: "Requisitos Kanban " + Date.now(),
      stages: {
        create: [
          { name: "Contactado", position: 0, probability: 15 },
          { name: "Negociación", position: 1, probability: 45, requirements: ["NEED"] },
        ],
      },
    },
    include: { stages: true },
  });
  gatedPipelineId = pipeline.id;
  const [contacted, negotiation] = [...pipeline.stages].sort((a, b) => a.position - b.position);
  for (let index = 1; index <= 12; index++)
    await prisma.deal.create({
      data: {
        title: "Lote " + String(index).padStart(2, "0"),
        value: 10,
        pipelineId: pipeline.id,
        stageId: contacted!.id,
        companyId,
        ownerId: seller.id,
        updatedAt: new Date(Date.now() - index * 60_000),
      },
    });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, seller.email);
  await expect(page).toHaveURL(/\/pipeline$/);
  await page.goto("/pipeline?pipelineId=" + pipeline.id);
  const column = page.getByRole("region", { name: "Etapa Contactado" });
  await expect(column.getByRole("article")).toHaveCount(10);
  await column.getByRole("button", { name: "Ver más (quedan 2)" }).click();
  await expect(column.getByRole("article")).toHaveCount(12);
  await expect(page.getByRole("region", { name: "Resumen comercial" })).toContainText("12 negocios en este pipeline");

  const card = page.getByRole("article", { name: "Negocio Lote 01" });
  await card.dragTo(page.getByRole("region", { name: "Etapa Negociación" }));
  const gate = page.getByRole("dialog", { name: "Cambiar de etapa" });
  await expect(gate).toContainText("Documenta la necesidad del cliente.");
  await gate.getByLabel("Necesidad del cliente").fill("Tienda en línea");
  await gate.getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(gate).not.toBeVisible();
  await expect(page.getByRole("region", { name: "Etapa Negociación" }).getByRole("article")).toHaveCount(1);
  const moved = await prisma.deal.findFirstOrThrow({ where: { pipelineId: pipeline.id, title: "Lote 01" } });
  expect([moved.stageId, moved.need]).toEqual([negotiation!.id, "Tienda en línea"]);

  await page
    .getByRole("article", { name: "Negocio Lote 02" })
    .dragTo(page.getByRole("region", { name: "Columna Perdido" }));
  const lose = page.getByRole("dialog", { name: "Cambiar de etapa" });
  await lose.getByLabel("Motivo de la pérdida").selectOption("NO_RESPONSE");
  await lose.getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(page.getByRole("region", { name: "Columna Perdido" }).getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Resumen comercial" })).toContainText("Perdidos");
  await page.screenshot({ path: "test-results/pipeline-gates-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("recorrido del tester con un negocio nuevo: Contactado → Negociación → Propuesta → Ganado, sin errores", async ({ page }) => {
  test.setTimeout(300_000);
  const pipeline = await prisma.pipeline.create({
    data: {
      name: "Recorrido Kanban " + Date.now(),
      stages: {
        create: [
          { name: "Contactado", position: 1, probability: 15 },
          { name: "Negociación", position: 2, probability: 45, requirements: ["CONTACT", "OWNER", "INTERACTION", "NEED", "NEXT_ACTIVITY"] },
          { name: "Propuesta", position: 3, probability: 70, requirements: ["SOLUTION", "BUDGET", "PROPOSAL_SENT", "EXPECTED_CLOSE"] },
          { name: "Ganado", position: 4, probability: 100 },
        ],
      },
    },
  });
  journeyPipelineId = pipeline.id;
  const failures: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 500) failures.push(response.status() + " " + response.url());
  });
  const tiempos: string[] = [];
  const timed = async (paso: string, run: () => Promise<unknown>) => {
    const start = Date.now();
    await run();
    tiempos.push(`${paso}: ${Date.now() - start} ms`);
  };
  const day = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
  const title = "Recorrido " + Date.now();
  const card = page.getByRole("article", { name: "Negocio " + title });
  const gate = page.getByRole("dialog", { name: "Cambiar de etapa" });
  const column = (name: string) => page.getByRole("region", { name: "Etapa " + name });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, seller.email);
  await expect(page).toHaveURL(/\/pipeline$/);
  await timed("tablero", async () => {
    await page.goto("/pipeline?pipelineId=" + pipeline.id);
    await expect(column("Contactado")).toBeVisible();
  });

  await column("Contactado").getByRole("button", { name: "Crear negocio" }).click();
  const form = page.getByRole("dialog", { name: "Crear nuevo negocio" });
  await form.getByLabel("Nombre del negocio").fill(title);
  await form.getByLabel("Monto (USD)").fill("500");
  await form.getByLabel("Contacto", { exact: true }).selectOption(contactId);
  await form.getByLabel("Responsable", { exact: true }).selectOption(seller.id);
  await timed("alta", async () => {
    await form.getByRole("button", { name: "Crear negocio", exact: true }).click();
    await expect(card).toBeVisible();
  });

  await timed("modal de Negociación", async () => {
    await card.dragTo(column("Negociación"));
    await expect(gate.getByRole("button", { name: "Guardar y continuar" })).toBeVisible();
  });
  await expect(gate).toContainText("Recomendación: mantén completa la ficha del negocio");
  await gate.getByLabel("Qué se habló").fill("Llamada de presentación");
  await gate.getByLabel("Necesidad del cliente").fill("Ordenar su cartera de clientes");
  await gate.getByLabel("Asunto de la próxima actividad").fill("Enviar demo");
  await gate.getByLabel("Programada para").fill(day(7));
  await timed("mover a Negociación", async () => {
    await gate.getByRole("button", { name: "Guardar y continuar" }).click();
    await expect(column("Negociación").getByRole("article", { name: "Negocio " + title })).toBeVisible();
  });

  // Sin productos la propuesta solo se registra en la ficha: guarda lo llenado y lleva allá, sin 422.
  await timed("modal de Propuesta", async () => {
    await card.dragTo(column("Propuesta"));
    await expect(gate.getByRole("button", { name: "Guardar e ir a la ficha" })).toBeVisible();
  });
  await expect(gate).toContainText("Los productos y las propuestas se registran en la ficha.");
  await gate.getByLabel("Solución de interés").fill("CRM Wave plan anual");
  await gate.getByLabel("Presupuesto (USD)").fill("6000");
  await gate.getByLabel("Fecha estimada de cierre").fill(day(30));
  const deal = await prisma.deal.findFirstOrThrow({ where: { pipelineId: pipeline.id, title } });
  await timed("guardar e ir a la ficha", async () => {
    await gate.getByRole("button", { name: "Guardar e ir a la ficha" }).click();
    await expect(page).toHaveURL(new RegExp("/pipeline/" + deal.id + "$"));
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  });
  const saved = await prisma.deal.findUniqueOrThrow({ where: { id: deal.id }, include: { stage: true } });
  expect([saved.stage.name, saved.solution, saved.budget?.toString()]).toEqual(["Negociación", "CRM Wave plan anual", "6000"]);

  await page.getByRole("button", { name: "Agregar producto" }).click();
  await page.getByLabel("Descripción del producto 1").fill("Licencia anual");
  await page.getByLabel("Cantidad del producto 1").fill("1");
  await page.getByLabel("Precio unitario del producto 1").fill("5000");
  await timed("guardar productos", async () => {
    await page.getByRole("button", { name: "Guardar productos" }).click();
    await expect(page.getByText("Productos guardados.")).toBeVisible();
  });

  // Con productos, el modal registra la propuesta; sin vigencia avisa en el campo y no guarda nada.
  await page.goto("/pipeline?pipelineId=" + pipeline.id);
  await card.dragTo(column("Propuesta"));
  await expect(gate.getByLabel("Vigente hasta")).toBeVisible();
  await gate.getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(gate).toContainText("Ingresa hasta cuándo es válida la propuesta, de hoy en adelante.");
  expect(await prisma.quote.count({ where: { dealId: deal.id } })).toBe(0);
  await gate.getByLabel("Vigente hasta").fill(day(15));
  await timed("mover a Propuesta con la propuesta", async () => {
    await gate.getByRole("button", { name: "Guardar y continuar" }).click();
    await expect(column("Propuesta").getByRole("article", { name: "Negocio " + title })).toBeVisible();
  });

  await timed("ficha", async () => {
    await page.goto("/pipeline/" + deal.id);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  });
  const [quote] = await prisma.quote.findMany({ where: { dealId: deal.id } });
  await page.getByText("Productos de " + quote!.number).click();
  await expect(page.getByText("1 × Licencia anual")).toBeVisible();
  await expect(page.getByText(new RegExp(`Propuesta ${quote!.number} enviada`))).toBeVisible();
  await page.getByLabel("Evidencia de aceptación").fill("Orden de compra 77 por correo");
  await page.getByRole("button", { name: "Marcar aceptada" }).click();
  await expect(page.getByText(`Propuesta ${quote!.number} aceptada`)).toBeVisible();
  await page.getByRole("button", { name: "Ganar", exact: true }).click();
  await timed("ganar", async () => {
    await page.getByRole("dialog", { name: "Ganar negocio" }).getByRole("button", { name: "Guardar y continuar" }).click();
    await expect(page.getByText("Ganado el")).toBeVisible();
  });
  console.log("\nTiempos del recorrido (pruebas):\n  " + tiempos.join("\n  ") + "\n");
  expect(failures).toEqual([]);
});

test("perdido con seguimiento → rechazado → la papelera elimina dos a la vez", async ({ page }) => {
  test.setTimeout(240_000);
  const titles = ["Zombie " + Date.now(), "Riesgo " + Date.now()];
  const ids: string[] = [];
  for (const title of titles) {
    const deal = await prisma.deal.create({
      data: { title, value: 80, pipelineId, stageId: initialId, contactId, companyId, ownerId: seller.id },
    });
    await prisma.dealStageHistory.create({ data: { dealId: deal.id, toStageId: initialId, changedById: seller.id } });
    ids.push(deal.id);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, seller.email);
  await expect(page).toHaveURL(/\/pipeline$/);
  await page.goto("/pipeline?pipelineId=" + pipelineId);
  const gate = page.getByRole("dialog", { name: "Cambiar de etapa" });
  const lostColumn = page.getByRole("region", { name: "Columna Perdido" });
  const trashZone = page.getByRole("region", { name: "Zona Rechazado" });

  // Con seis columnas Perdido queda tras el scroll horizontal: se usa el selector de la tarjeta.
  await page.getByLabel("Mover " + titles[0] + " de etapa").selectOption({ label: "Perdido" });
  await gate.getByLabel("Motivo de la pérdida").selectOption("NEED_POSTPONED");
  await gate.getByLabel("Asunto del seguimiento").fill("Retomar en temporada");
  await gate.getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(lostColumn.getByRole("article", { name: "Negocio " + titles[0] })).toBeVisible();
  const followUp = await prisma.activity.findFirstOrThrow({ where: { dealId: ids[0] } });
  expect([followUp.subject, followUp.status, followUp.contactId]).toEqual(["Retomar en temporada", "PENDING", contactId]);

  // Un vendedor pasa el perdido a Rechazado: el seguimiento queda cancelado.
  // La zona queda tras el scroll horizontal: se muestra antes de arrastrar, o el scroll a mitad del arrastre toma el enlace.
  await trashZone.scrollIntoViewIfNeeded();
  await lostColumn.getByRole("article", { name: "Negocio " + titles[0] }).dragTo(trashZone);
  await expect(gate).toContainText("Se invalidará el proceso");
  await gate.getByLabel("Motivo del rechazo").selectOption("DO_NOT_CONTACT");
  await gate.getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(trashZone).toContainText("1 negocio en la papelera");
  await page.getByLabel("Mover " + titles[1] + " de etapa").selectOption({ label: "Rechazado" });
  await gate.getByLabel("Motivo del rechazo").selectOption("COMMERCIAL_RISK");
  await gate.getByRole("button", { name: "Guardar y continuar" }).click();
  await expect(trashZone).toContainText("2 negocios en la papelera");
  expect((await prisma.activity.findUniqueOrThrow({ where: { id: followUp.id } })).status).toBe("CANCELLED");

  await page.goto("/contactos/" + contactId);
  await expect(page.getByRole("link", { name: titles[0] })).toBeVisible();
  await expect(page.getByText("Inicial · Rechazado").first()).toBeVisible();

  await page.goto("/pipeline?pipelineId=" + pipelineId);
  await trashZone.getByRole("link", { name: "Ver papelera" }).click();
  await expect(page.getByRole("heading", { name: "Papelera" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reabrir " + titles[0] })).toHaveCount(0);
  // ponytail: solo los dos de esta prueba; «Seleccionar todos» borraría rechazados ajenos de la rama compartida.
  for (const title of titles) await page.getByLabel("Seleccionar " + title).check();
  await page.getByRole("button", { name: "Eliminar seleccionados (2)" }).click();
  const confirm = page.getByRole("dialog", { name: "Eliminar de la papelera" });
  await confirm.getByRole("button", { name: "Eliminar definitivamente" }).click();
  await expect(page.getByText("Se eliminaron 2 negocios.")).toBeVisible();
  expect(await prisma.deal.count({ where: { id: { in: ids } } })).toBe(0);
  expect(await prisma.auditLog.count({ where: { entityId: { in: ids }, action: "DELETED" } })).toBe(2);
  await prisma.auditLog.deleteMany({ where: { entityType: "Deal", entityId: { in: ids } } });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
