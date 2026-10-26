import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { qualifyDealAction } from "./actions";
import { baseDeal } from "./deal-fixture";
import { DealQualification } from "./deal-qualification";

vi.mock("./actions", () => ({ qualifyDealAction: vi.fn() }));
const qualify = vi.mocked(qualifyDealAction);

test("guarda necesidad, solución, presupuesto, justificación y decisor", async () => {
  qualify.mockResolvedValue({});
  const user = userEvent.setup();
  render(<DealQualification deal={{ ...baseDeal, decisionMaker: "Gerente general" }} locked={false} />);
  expect(screen.getByLabelText("Persona decisora")).toHaveValue("Gerente general");
  await user.type(screen.getByLabelText("Necesidad del cliente"), "Tienda en línea");
  await user.type(screen.getByLabelText("Solución de interés"), "Plan anual");
  await user.type(screen.getByLabelText("Presupuesto (USD)"), "5000,50");
  await user.click(screen.getByRole("button", { name: "Guardar calificación" }));
  const form = qualify.mock.calls[0]?.[1] as FormData;
  expect(qualify.mock.calls[0]?.[0]).toBe("d1");
  expect([form.get("need"), form.get("solution"), form.get("budget"), form.get("decisionMaker")]).toEqual([
    "Tienda en línea",
    "Plan anual",
    "5000,50",
    "Gerente general",
  ]);
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Calificación guardada."));
});

test("un presupuesto inválido se marca en su campo", async () => {
  qualify.mockResolvedValue({ fieldErrors: { budget: "Ingresa un presupuesto con hasta dos decimales, por ejemplo 5000 o 5000,50." } });
  const user = userEvent.setup();
  render(<DealQualification deal={baseDeal} locked={false} />);
  await user.click(screen.getByRole("button", { name: "Guardar calificación" }));
  expect(await screen.findByText(/presupuesto con hasta dos decimales/)).toBeInTheDocument();
  expect(screen.getByLabelText("Presupuesto (USD)")).toHaveAttribute("aria-invalid", "true");
});

test("un negocio cerrado muestra la calificación sin poder editarla", () => {
  render(
    <DealQualification
      deal={{ ...baseDeal, status: "WON", need: "Tienda en línea", budget: null, budgetNote: "Sin definir" }}
      locked
    />,
  );
  expect(screen.getByText("Tienda en línea")).toBeInTheDocument();
  expect(screen.getByText("Sin definir")).toBeInTheDocument();
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.queryByRole("button", { name: "Guardar calificación" })).toBeNull();
});
