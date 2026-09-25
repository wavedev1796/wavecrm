import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ImportContactsPage from "./page";

vi.mock("./actions", () => ({ importContacts: vi.fn() }));

test("explica el formato del archivo y la regla de todo o nada", () => {
  render(<ImportContactsPage />);
  expect(
    screen.getByRole("heading", { name: "Importar contactos desde CSV" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/no se guarda ninguna/)).toBeInTheDocument();
  expect(screen.getByText(/1000 filas/)).toBeInTheDocument();
  expect(screen.getByLabelText("Archivo CSV")).toHaveAttribute(
    "accept",
    ".csv,text/csv",
  );
});
