import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { saveCompany } from "./actions";
import { CompanyForm } from "./company-form";
import { emptyCompanyValues } from "./company-form-state";

vi.mock("./actions", () => ({ saveCompany: vi.fn() }));
const save = vi.mocked(saveCompany);

test("CRM-15: marca los errores al guardar y avisa al terminar bien", async () => {
  const onSaved = vi.fn();
  save.mockResolvedValueOnce({
    feedback: null,
    fieldErrors: { taxId: "Ingresa el RUC." },
    values: emptyCompanyValues,
  });
  save.mockResolvedValueOnce({
    feedback: null,
    fieldErrors: {},
    values: emptyCompanyValues,
    saved: true,
  });
  const user = userEvent.setup();
  render(<CompanyForm onSaved={onSaved} />);
  expect(screen.getByLabelText("País del teléfono")).toHaveValue("EC");

  await user.click(screen.getByRole("button", { name: "Crear empresa" }));
  expect(await screen.findByText("Ingresa el RUC.")).toBeInTheDocument();
  expect(screen.getByLabelText("RUC")).toHaveFocus();
  expect(onSaved).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "Crear empresa" }));
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
});

test("CRM-15: un fallo del servidor se muestra en una alerta", async () => {
  save.mockResolvedValueOnce({
    feedback: {
      tone: "error",
      message: "No pudimos conectar con el servidor. Inténtalo de nuevo.",
    },
    fieldErrors: {},
    values: emptyCompanyValues,
  });
  const user = userEvent.setup();
  const onCancel = vi.fn();
  render(<CompanyForm onCancel={onCancel} />);
  await user.click(screen.getByRole("button", { name: "Crear empresa" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No pudimos conectar con el servidor.",
  );
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(onCancel).toHaveBeenCalled();
});
