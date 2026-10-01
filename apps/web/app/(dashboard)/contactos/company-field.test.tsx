import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { searchCompanies } from "./actions";
import { CompanyField } from "./company-field";

vi.mock("./actions", () => ({ searchCompanies: vi.fn() }));
const search = vi.mocked(searchCompanies);
const hidden = () =>
  document.querySelector<HTMLInputElement>('input[name="companyId"]');

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("sugiere empresas y guarda el id al elegir una o al pegar su RUC", async () => {
  search.mockResolvedValue([
    {
      id: "e1",
      label: "Comercial Andina · 1791234561001",
      taxId: "1791234561001",
    },
  ]);
  render(<CompanyField defaultLabel="" defaultId="" />);
  const input = screen.getByLabelText("Empresa donde trabaja (opcional)");
  fireEvent.change(input, { target: { value: "andina" } });
  await act(async () => vi.advanceTimersByTime(300));
  expect(search).toHaveBeenCalledWith("andina");
  expect(document.querySelector("datalist option")).toHaveAttribute(
    "value",
    "Comercial Andina · 1791234561001",
  );
  expect(hidden()).toHaveValue("");

  fireEvent.change(input, {
    target: { value: "Comercial Andina · 1791234561001" },
  });
  expect(hidden()).toHaveValue("e1");
  fireEvent.change(input, { target: { value: "179 1234561 001" } });
  expect(hidden()).toHaveValue("e1");
  fireEvent.change(input, { target: { value: "Otra cosa" } });
  expect(hidden()).toHaveValue("");
});

test("si la sesión vence mientras busca, no se cae: la acción redirige al login y no devuelve nada", async () => {
  search.mockResolvedValue(undefined as never);
  render(<CompanyField defaultLabel="" defaultId="" />);
  fireEvent.change(screen.getByLabelText("Empresa donde trabaja (opcional)"), {
    target: { value: "andina" },
  });
  await act(async () => vi.advanceTimersByTime(300));
  expect(document.querySelector("datalist option")).toBeNull();
  expect(hidden()).toHaveValue("");
});

test("es opcional: explica que puede quedar vacío y enlaza la ayuda y el error", () => {
  const { rerender } = render(<CompanyField defaultLabel="" defaultId="" />);
  const input = screen.getByLabelText("Empresa donde trabaja (opcional)");
  expect(input).not.toBeRequired();
  expect(input).toHaveAccessibleDescription(
    "Déjalo vacío si trabaja de forma independiente.",
  );

  rerender(
    <CompanyField
      defaultLabel="Otra"
      defaultId=""
      error="Elige una empresa de la lista o deja el campo vacío."
    />,
  );
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription(
    "Déjalo vacío si trabaja de forma independiente. Elige una empresa de la lista o deja el campo vacío.",
  );
});

test("al editar conserva la empresa vinculada", () => {
  render(
    <CompanyField
      defaultLabel="Comercial Andina · 1791234561001"
      defaultId="e1"
    />,
  );
  expect(screen.getByLabelText("Empresa donde trabaja (opcional)")).toHaveValue(
    "Comercial Andina · 1791234561001",
  );
  expect(hidden()).toHaveValue("e1");
});
