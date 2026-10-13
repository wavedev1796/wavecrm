import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { dealHistoryAction } from "./actions";
import { DealHistory } from "./deal-history";
vi.mock("./actions", () => ({ dealHistoryAction: vi.fn() }));

test("muestra la creación y los movimientos con su responsable", async () => {
  vi.mocked(dealHistoryAction).mockResolvedValue({
    data: [
      {
        id: "h2",
        changedAt: "2026-10-02T15:00:00Z",
        fromStage: { id: "s1", name: "Inicial" },
        toStage: { id: "s2", name: "Propuesta" },
        changedBy: null,
      },
      {
        id: "h1",
        changedAt: "2026-10-01T15:00:00Z",
        fromStage: null,
        toStage: { id: "s1", name: "Inicial" },
        changedBy: { id: "u1", name: "Eduardo" },
      },
    ],
  });
  render(<DealHistory id="d1" />);
  expect(screen.getByText("Cargando historial...")).toBeInTheDocument();
  expect(await screen.findByText("Inicial → Propuesta")).toBeInTheDocument();
  expect(screen.getByText("Creado en Inicial")).toBeInTheDocument();
  expect(screen.getByText(/Usuario no disponible/)).toBeInTheDocument();
  expect(screen.getByText(/Eduardo/)).toBeInTheDocument();
  expect(dealHistoryAction).toHaveBeenCalledWith("d1");
});

test("sin movimientos lo dice en lugar de dejar la lista vacía", async () => {
  vi.mocked(dealHistoryAction).mockResolvedValue({ data: [] });
  render(<DealHistory id="d1" />);
  expect(
    await screen.findByText("Este negocio aun no registra movimientos."),
  ).toBeInTheDocument();
});

test("un error del API se muestra como alerta", async () => {
  vi.mocked(dealHistoryAction).mockResolvedValue({ error: "Negocio no encontrado." });
  render(<DealHistory id="d1" />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Negocio no encontrado.",
  );
});

test("si la acción falla por red, deja de cargar y avisa", async () => {
  vi.mocked(dealHistoryAction).mockRejectedValue(new Error("fetch failed"));
  render(<DealHistory id="d1" />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No pudimos conectar con el servidor. Inténtalo de nuevo.",
  );
  expect(screen.queryByText("Cargando historial...")).toBeNull();
});
