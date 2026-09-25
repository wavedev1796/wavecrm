import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { importContacts } from "./actions";
import { ImportForm } from "./import-form";

vi.mock("./actions", () => ({ importContacts: vi.fn() }));
const importMock = vi.mocked(importContacts);

const csv = (text: string) =>
  new File([text], "contactos.csv", { type: "text/csv" });

test("al elegir el archivo propone una columna por campo y envía el mapeo elegido", async () => {
  importMock.mockResolvedValue({
    tone: "success",
    message: "Se importaron 2 contactos.",
    errors: [],
  });
  const user = userEvent.setup();
  render(<ImportForm />);
  expect(
    screen.getByRole("button", { name: "Importar contactos" }),
  ).toBeDisabled();

  await user.upload(
    screen.getByLabelText("Archivo CSV"),
    csv("Nombres;APELLIDOS;Cédula;Notas\nAna;López;;"),
  );
  expect(await screen.findByLabelText("Nombre *")).toHaveValue("Nombres");
  expect(screen.getByLabelText("Apellido *")).toHaveValue("APELLIDOS");
  expect(screen.getByLabelText("Cédula")).toHaveValue("Cédula");
  expect(screen.getByLabelText("Correo")).toHaveValue("");

  await user.selectOptions(screen.getByLabelText("Cargo"), "Notas");
  await user.click(screen.getByRole("button", { name: "Importar contactos" }));

  expect(await screen.findByRole("status")).toHaveTextContent(
    "Se importaron 2 contactos.",
  );
  expect(screen.getByRole("link", { name: "Ver contactos" })).toHaveAttribute(
    "href",
    "/contactos",
  );
  const sent = importMock.mock.calls[0]?.[1];
  expect(JSON.parse(sent?.get("mapping") as string)).toEqual({
    firstName: "Nombres",
    lastName: "APELLIDOS",
    documentId: "Cédula",
    position: "Notas",
  });
});

test("un archivo de más de 1 MB o sin cabecera se explica antes de enviarlo", async () => {
  const user = userEvent.setup();
  render(<ImportForm />);
  const input = screen.getByLabelText("Archivo CSV");

  await user.upload(input, csv(`Nombre\n${"x".repeat(1024 * 1024)}`));
  expect(
    await screen.findByText(
      "El archivo supera 1 MB. Divídelo en partes más pequeñas.",
    ),
  ).toBeInTheDocument();
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(
    screen.getByRole("button", { name: "Importar contactos" }),
  ).toBeDisabled();

  await user.upload(input, csv("\n\n"));
  expect(
    await screen.findByText("El archivo no tiene una fila de cabecera."),
  ).toBeInTheDocument();

  await user.upload(input, csv("Nombre;Apellido\nAna;López"));
  expect(await screen.findByLabelText("Nombre *")).toHaveValue("Nombre");
  expect(input).not.toHaveAttribute("aria-invalid");
  expect(importMock).not.toHaveBeenCalled();
});

test("muestra el reporte de errores por fila", async () => {
  importMock.mockResolvedValue({
    tone: "error",
    message: "No se importó ningún contacto: 1 fila tiene errores.",
    errors: [{ row: 3, column: "Cédula", message: "La cédula no es válida." }],
  });
  const user = userEvent.setup();
  render(<ImportForm />);
  await user.upload(
    screen.getByLabelText("Archivo CSV"),
    csv("Nombre,Apellido,Cédula\nAna,López,1712345678"),
  );
  await screen.findByLabelText("Nombre *");
  await user.click(screen.getByRole("button", { name: "Importar contactos" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No se importó ningún contacto: 1 fila tiene errores.",
  );
  const table = screen.getByRole("table", { name: "Errores por fila" });
  expect(table).toHaveTextContent("Fila");
  expect(table).toHaveTextContent("3CédulaLa cédula no es válida.");
  expect(
    screen.getByText(
      "Corrige esas filas en el archivo y vuelve a elegirlo para importarlo.",
    ),
  ).toBeInTheDocument();
});
