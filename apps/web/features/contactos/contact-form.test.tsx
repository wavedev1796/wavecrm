import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { saveContact } from "./actions";
import { ContactForm } from "./contact-form";
import { emptyContactValues } from "./contact-form-state";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./actions", () => ({
  saveContact: vi.fn(),
  searchCompanies: vi.fn(async () => []),
}));
const save = vi.mocked(saveContact);

test("no valida mientras se escribe ni al salir del campo", () => {
  render(<ContactForm />);
  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "A1" },
  });
  fireEvent.blur(screen.getByLabelText("Nombre"));
  expect(screen.queryByText(/solo puede tener letras/)).toBeNull();
  expect(screen.getByLabelText("Nombre")).not.toHaveAttribute("aria-invalid");
});

test("el documento es obligatorio: arranca en Cédula y el número toma la etiqueta de su tipo", async () => {
  const user = userEvent.setup();
  render(<ContactForm />);
  const type = screen.getByLabelText("Tipo de documento");
  expect(type).toHaveValue("CEDULA");
  expect(type).toBeRequired();
  expect(type).toHaveClass("select-control");
  expect(screen.queryByRole("option", { name: "Sin documento" })).toBeNull();
  expect(screen.getByLabelText("Cédula")).toBeRequired();
  expect(
    screen.getByText(
      "Los campos con * son obligatorios, además de un teléfono o un correo. Los datos se validan al guardar.",
    ),
  ).toBeInTheDocument();

  await user.selectOptions(type, "PASAPORTE");
  expect(screen.getByLabelText("Pasaporte")).toHaveAttribute(
    "placeholder",
    "AB123456",
  );
  expect(screen.queryByLabelText("Cédula")).toBeNull();
});

test("al guardar marca cada error en su campo, enfoca el primero y lo borra al editarlo", async () => {
  save.mockResolvedValue({
    feedback: null,
    fieldErrors: {
      firstName:
        "El nombre solo puede tener letras, espacios, apóstrofos, guiones y puntos.",
      province: "Elige una provincia de Ecuador.",
    },
    values: { ...emptyContactValues, firstName: "A1", lastName: "López" },
  });
  const user = userEvent.setup();
  render(<ContactForm />);
  await user.click(screen.getByRole("button", { name: "Crear contacto" }));

  expect(
    await screen.findByText("Elige una provincia de Ecuador."),
  ).toBeInTheDocument();
  const name = screen.getByLabelText("Nombre");
  expect(name).toHaveAttribute("aria-invalid", "true");
  expect(name).toHaveFocus();

  await user.type(name, "x");
  expect(screen.queryByText(/solo puede tener letras/)).toBeNull();
  expect(
    screen.getByText("Elige una provincia de Ecuador."),
  ).toBeInTheDocument();
});
