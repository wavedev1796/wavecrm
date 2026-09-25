import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, expect, test, vi } from "vitest";
import { NewContactDialog } from "./new-contact-dialog";

vi.mock("./contact-form", () => ({
  ContactForm: ({ onCancel }: { onCancel: () => void }) => (
    <div>
      <h2>Formulario nuevo</h2>
      <button onClick={onCancel}>Cancelar formulario</button>
    </div>
  ),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});

test("abre y cierra el alta de contacto como diálogo modal", () => {
  render(<NewContactDialog />);
  const dialog = screen.getByRole("dialog", { hidden: true });
  expect(dialog).not.toHaveAttribute("open");
  fireEvent.click(screen.getByRole("button", { name: "Nuevo contacto" }));
  expect(dialog).toHaveAttribute("open");
  expect(
    screen.getByRole("heading", { name: "Formulario nuevo" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancelar formulario" }));
  expect(dialog).not.toHaveAttribute("open");
});
