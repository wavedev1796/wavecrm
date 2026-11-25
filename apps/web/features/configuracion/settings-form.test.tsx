import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { saveSettingsAction } from "./actions";
import { SettingsForm } from "./settings-form";

vi.mock("./actions", () => ({ saveSettingsAction: vi.fn() }));
const save = vi.mocked(saveSettingsAction);
beforeEach(() => save.mockReset());

test("un IVA fuera de 0 a 100 muestra el error y no llama a la acción", async () => {
  const user = userEvent.setup();
  render(<SettingsForm taxRate={15} />);
  const input = screen.getByLabelText(/IVA general/);
  await user.clear(input);
  await user.type(input, "101");
  await user.click(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByText("El IVA debe ser un porcentaje entero entre 0 y 100.")).toBeInTheDocument();
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(save).not.toHaveBeenCalled();
});

test("un IVA válido llama a la acción y avisa que se guardó", async () => {
  save.mockResolvedValue({ saved: true });
  const user = userEvent.setup();
  render(<SettingsForm taxRate={15} />);
  const input = screen.getByLabelText(/IVA general/);
  expect(input).toHaveValue("15");
  await user.clear(input);
  await user.type(input, "12");
  await user.click(screen.getByRole("button", { name: "Guardar" }));
  expect(save).toHaveBeenCalledTimes(1);
  expect((save.mock.calls[0]?.[1] as FormData).get("taxRate")).toBe("12");
  expect(await screen.findByText("Configuración guardada.")).toBeInTheDocument();
});

test("si el API rechaza el cambio, muestra su mensaje", async () => {
  save.mockResolvedValue({ error: "No tienes permiso." });
  const user = userEvent.setup();
  render(<SettingsForm taxRate={15} />);
  await user.click(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No tienes permiso.");
});
