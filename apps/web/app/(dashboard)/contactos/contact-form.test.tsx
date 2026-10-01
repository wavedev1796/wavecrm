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

test("el número de documento aparece al elegir su tipo, con su etiqueta", async () => {
  const user = userEvent.setup();
  render(<ContactForm />);
  expect(screen.getByLabelText("Tipo de documento")).toHaveClass(
    "select-control",
  );
  expect(screen.queryByLabelText("Pasaporte")).toBeNull();
  await user.selectOptions(
    screen.getByLabelText("Tipo de documento"),
    "PASAPORTE",
  );
  expect(screen.getByLabelText("Pasaporte")).toHaveAttribute(
    "placeholder",
    "AB123456",
  );
  await user.selectOptions(screen.getByLabelText("Tipo de documento"), "");
  expect(screen.queryByLabelText("Pasaporte")).toBeNull();
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
