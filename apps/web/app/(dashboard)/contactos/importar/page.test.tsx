import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ImportContactsPage from "./page";

vi.mock("./actions", () => ({ importContacts: vi.fn() }));

test("explica el formato del archivo y la regla de todo o nada", () => {
  render(<ImportContactsPage />);
  expect(
    screen.getByRole("heading", { name: "Importar contactos desde Excel o CSV" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/no se guarda ninguna/)).toBeInTheDocument();
  expect(screen.getByText(/1000 filas/)).toBeInTheDocument();
  expect(screen.getByLabelText("Archivo Excel o CSV")).toHaveAttribute(
    "accept",
    ".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv",
  );
});
