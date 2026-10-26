import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import PipelinePage from "./page";
vi.mock("@/lib/authenticated-api", () => ({
  authenticatedApi: vi.fn(),
  apiError: async () => "No disponible",
}));
vi.mock("next/navigation", () => ({
  unstable_rethrow: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("../../../features/pipeline/actions", () => ({
  previewTransitionAction: vi.fn(),
  saveDeal: vi.fn(),
  configurePipelineAction: vi.fn(),
}));
const api = vi.mocked(authenticatedApi);
test("carga el pipeline solicitado y todas las paginas de opciones", async () => {
  const stage = {
    id: "s1",
    name: "Inicial",
    position: 0,
    probability: 10,
    color: null,
    deals: [],
    value: "0",
    count: 0,
  };
  api.mockImplementation(async (path) => {
    if (path === "/pipelines")
      return Response.json([
        { id: "p1", name: "Ventas", isDefault: true, stages: [stage] },
      ]);
    if (path.startsWith("/deals/board"))
      return Response.json({
        pipeline: { id: "p1", name: "Ventas", isDefault: true },
        stages: [stage],
        lost: { count: 0, value: "0.00", deals: [] },
        metrics: Object.fromEntries(["open", "won", "lost", "rejected"].map((k) => [k, { count: 0, value: "0.00" }])),
      });
    if (path === "/contacts?limit=100&page=1")
      return Response.json({
        data: [{ id: "c1", firstName: "Ana", lastName: "Paz" }],
        meta: { totalPages: 2 },
      });
    if (path === "/contacts?limit=100&page=2")
      return Response.json({
        data: [{ id: "c2", firstName: "Otra", lastName: "Pagina" }],
        meta: { totalPages: 2 },
      });
    if (path.startsWith("/companies"))
      return Response.json({ data: [], meta: { totalPages: 0 } });
    return Response.json([]);
  });
  render(
    await PipelinePage({ searchParams: Promise.resolve({ pipelineId: "p1" }) }),
  );
  expect(api).toHaveBeenCalledWith("/deals/board?pipelineId=p1");
  await userEvent.click(screen.getByRole("button", { name: "Nuevo negocio" }));
  expect(
    screen.getByRole("option", { name: "Otra Pagina" }),
  ).toBeInTheDocument();
});
test("sin pipelines invita a crear el primero aunque el tablero responda 404", async () => {
  api.mockImplementation(async (path) =>
    path.startsWith("/deals/board")
      ? Response.json({ error: { message: "No hay un pipeline configurado." } }, { status: 404 })
      : Response.json(path === "/pipelines" || path === "/pipeline/owners" ? [] : { data: [], meta: { totalPages: 0 } }),
  );
  render(await PipelinePage({}));
  expect(api).toHaveBeenCalledWith("/deals/board");
  expect(screen.getByText("Crea tu primer pipeline y agrega sus etapas para comenzar.")).toBeInTheDocument();
});
test("un fallo de catalogos muestra un estado recuperable", async () => {
  api.mockRejectedValue(new Error("offline"));
  render(await PipelinePage({}));
  expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar");
  expect(screen.getByRole("link", { name: "Volver a cargar" })).toHaveAttribute(
    "href",
    "/pipeline",
  );
});
