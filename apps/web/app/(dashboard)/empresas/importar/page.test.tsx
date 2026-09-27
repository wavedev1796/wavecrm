import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ImportCompaniesPage from "./page";

vi.mock("./actions", () => ({ importCompanies: vi.fn() }));

test("CRM-15: explica las reglas e importa empresas", () => {
  render(<ImportCompaniesPage />);
  expect(
    screen.getByRole("heading", { name: "Importar empresas desde CSV" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Nombre y RUC son obligatorios; el resto de columnas es opcional.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Importar empresas" }),
  ).toBeDisabled();
});
