import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { PipelineSettings } from "./pipeline-settings";
import { configurePipelineAction } from "./actions";
import type { Pipeline } from "./types";

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("./actions", () => ({ configurePipelineAction: vi.fn() }));
const configure = vi.mocked(configurePipelineAction);

const stage = (id: string, name: string, position: number, color: string | null) => ({
  id,
  name,
  color,
  position,
  probability: position * 50,
  count: 0,
  value: "0",
  deals: [],
});
const pipelines: Pipeline[] = [
  {
    id: "p1",
    name: "Ventas",
    isDefault: true,
    stages: [stage("s1", "Inicial", 0, "#2f6f8f"), stage("s2", "Propuesta", 1, "#123456")],
  },
  { id: "p2", name: "Alianzas", isDefault: false, stages: [] },
];

beforeEach(() => {
  configure.mockResolvedValue({ data: { id: "p9" } });
});

async function open(pipelineId = "p1") {
  const user = userEvent.setup();
  render(<PipelineSettings pipelines={pipelines} pipelineId={pipelineId} />);
  await user.click(screen.getByRole("button", { name: "Configurar pipeline" }));
  return { user, dialog: screen.getByRole("dialog", { name: "Configurar pipeline" }) };
}

const sent = () => Object.fromEntries(configure.mock.calls.at(-1)![2] as FormData);

test("guardar el pipeline principal lo actualiza y refresca el tablero", async () => {
  const { user, dialog } = await open();
  expect(within(dialog).queryByRole("button", { name: "Eliminar pipeline" })).toBeNull();
  await user.click(within(dialog).getByRole("button", { name: "Guardar pipeline" }));

  await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  expect(configure).toHaveBeenCalledWith("updatePipeline", "p1", expect.any(FormData));
  expect(sent()).toEqual({ name: "Ventas", isDefault: "true" });
  expect(dialog).not.toHaveAttribute("open");
});

test("crear otro pipeline navega al nuevo", async () => {
  const { user, dialog } = await open();
  await user.selectOptions(within(dialog).getByLabelText("Pipeline"), "");
  expect(within(dialog).queryByText("Etapas del embudo")).toBeNull();
  await user.type(within(dialog).getByLabelText(/^Nombre/), "Licitaciones");
  await user.click(within(dialog).getByRole("button", { name: "Crear pipeline" }));

  await waitFor(() => expect(router.push).toHaveBeenCalledWith("/pipeline?pipelineId=p9"));
  expect(configure).toHaveBeenCalledWith("createPipeline", "", expect.any(FormData));
});

test("eliminar un pipeline secundario pide confirmación y vuelve al tablero", async () => {
  const { user, dialog } = await open("p2");
  await user.click(within(dialog).getByRole("button", { name: "Eliminar pipeline" }));
  expect(within(dialog).getByText(/Confirma que deseas eliminar Alianzas/)).toBeInTheDocument();
  await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
  expect(within(dialog).queryByText(/Confirma que deseas eliminar/)).toBeNull();

  await user.click(within(dialog).getByRole("button", { name: "Eliminar pipeline" }));
  await user.click(within(dialog).getByRole("button", { name: "Confirmar eliminacion" }));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith("/pipeline"));
  expect(configure).toHaveBeenCalledWith("deletePipeline", "p2", expect.any(FormData));
});

test("una etapa nueva va al final con el color por defecto", async () => {
  const { user, dialog } = await open();
  expect(within(dialog).getByLabelText(/^Orden de la etapa/)).toHaveValue("2");
  await user.type(within(dialog).getByLabelText(/^Nombre de etapa/), "Cierre");
  await user.click(within(dialog).getByRole("button", { name: "Agregar etapa" }));

  await waitFor(() => expect(configure).toHaveBeenCalled());
  expect(configure).toHaveBeenCalledWith("createStage", "p1", expect.any(FormData));
  expect(sent()).toEqual({ name: "Cierre", probability: "0", position: "2", color: "#2f6f8f" });
});

test("editar una etapa conserva su color propio y permite eliminarla", async () => {
  const { user, dialog } = await open();
  await user.selectOptions(within(dialog).getByLabelText("Etapa a configurar"), "s2");
  expect(within(dialog).getByLabelText("Color")).toHaveValue("#123456");
  expect(within(dialog).getByRole("option", { name: "Color actual" })).toBeInTheDocument();
  await user.click(within(dialog).getByRole("button", { name: "Guardar etapa" }));
  await waitFor(() => expect(configure).toHaveBeenCalledWith("updateStage", "s2", expect.any(FormData)));
  expect(sent()).toMatchObject({ name: "Propuesta", position: "1", color: "#123456" });

  await user.click(screen.getByRole("button", { name: "Configurar pipeline" }));
  await user.selectOptions(within(dialog).getByLabelText("Etapa a configurar"), "s1");
  expect(within(dialog).queryByRole("option", { name: "Color actual" })).toBeNull();
  await user.click(within(dialog).getByRole("button", { name: "Eliminar etapa" }));
  expect(within(dialog).getByText(/Confirma que deseas eliminar Inicial/)).toBeInTheDocument();
  await user.click(within(dialog).getByRole("button", { name: "Confirmar eliminacion" }));
  await waitFor(() => expect(configure).toHaveBeenCalledWith("deleteStage", "s1", expect.any(FormData)));
});

test("un error del API se muestra y cierra la confirmación", async () => {
  configure.mockResolvedValue({ error: "La etapa tiene negocios." });
  const { user, dialog } = await open();
  await user.selectOptions(within(dialog).getByLabelText("Etapa a configurar"), "s1");
  await user.click(within(dialog).getByRole("button", { name: "Eliminar etapa" }));
  await user.click(within(dialog).getByRole("button", { name: "Confirmar eliminacion" }));

  await waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent("La etapa tiene negocios."));
  expect(within(dialog).queryByText(/Confirma que deseas eliminar/)).toBeNull();
  expect(dialog).toHaveAttribute("open");
  expect(router.refresh).not.toHaveBeenCalled();
});
