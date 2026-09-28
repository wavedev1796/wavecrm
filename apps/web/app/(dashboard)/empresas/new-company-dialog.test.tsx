import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, expect, test, vi } from "vitest";
import { NewCompanyDialog } from "./new-company-dialog";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("./company-form", () => ({
  CompanyForm: ({ onSaved }: { onSaved: () => void }) => (
    <button onClick={onSaved}>Guardar formulario</button>
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

test("CRM-15: al crear cierra el diálogo y el listado avisa; la X también lo cierra", () => {
  render(<NewCompanyDialog />);
  const dialog = screen.getByRole("dialog", { hidden: true });
  const open = () =>
    fireEvent.click(screen.getByRole("button", { name: "Añadir empresa" }));

  open();
  fireEvent.click(screen.getByRole("button", { name: "Guardar formulario" }));
  expect(dialog).not.toHaveAttribute("open");
  expect(replace).toHaveBeenCalledWith("/empresas?creada=1", { scroll: false });

  open();
  expect(dialog).toHaveAttribute("open");
  fireEvent.click(
    screen.getByRole("button", { name: "Cerrar añadir empresa" }),
  );
  expect(dialog).not.toHaveAttribute("open");
});
