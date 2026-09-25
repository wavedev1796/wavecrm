import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ContactForm } from "./contact-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./actions", () => ({
  saveContact: vi.fn(),
}));

test("CRM-14: muestra visualmente errores de cédula y RUC al salir del campo", () => {
  render(<ContactForm />);
  fireEvent.change(screen.getByLabelText("Cédula"), {
    target: { value: "171" },
  });
  fireEvent.blur(screen.getByLabelText("Cédula"));
  fireEvent.change(screen.getByLabelText("RUC de la empresa"), {
    target: { value: "179" },
  });
  fireEvent.blur(screen.getByLabelText("RUC de la empresa"));
  expect(
    screen.getByText("La cédula debe tener 10 dígitos."),
  ).toBeInTheDocument();
  expect(screen.getByText("El RUC debe tener 13 dígitos.")).toBeInTheDocument();
  expect(screen.getByLabelText("Cédula")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});
