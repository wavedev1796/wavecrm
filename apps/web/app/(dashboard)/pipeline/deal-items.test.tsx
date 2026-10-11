import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { saveDealItemsAction } from "./actions";
import { DealItems } from "./deal-items";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./actions", () => ({ saveDealItemsAction: vi.fn() }));
const save = vi.mocked(saveDealItemsAction);

test("agrega productos, muestra subtotal, IVA y total y los guarda", async () => {
  save.mockResolvedValue({});
  const user = userEvent.setup();
  render(<DealItems dealId="d1" items={[]} locked={false} />);
  expect(screen.getByText(/Aún no hay productos/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Agregar producto" }));
  await user.click(screen.getByRole("button", { name: "Agregar producto" }));
  await user.type(screen.getByLabelText("Descripción del producto 1"), "Paquete de chocolates");
  await user.type(screen.getByLabelText("Cantidad del producto 1"), "2");
  await user.type(screen.getByLabelText("Precio unitario del producto 1"), "10");
  await user.selectOptions(screen.getByLabelText("IVA del producto 1"), "0");
  await user.type(screen.getByLabelText("Descripción del producto 2"), "Paquete de vinos");
  await user.type(screen.getByLabelText("Cantidad del producto 2"), "1");
  await user.type(screen.getByLabelText("Precio unitario del producto 2"), "100");
  expect(screen.getByTestId("deal-total")).toHaveTextContent("135,00");
  await user.click(screen.getByRole("button", { name: "Guardar productos" }));
  expect(save).toHaveBeenCalledWith("d1", [
    { description: "Paquete de chocolates", quantity: "2", unitPrice: "10", taxRate: "0" },
    { description: "Paquete de vinos", quantity: "1", unitPrice: "100", taxRate: "15" },
  ]);
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Productos guardados."));
});

test("marca la celda con error que devuelve la validacion", async () => {
  save.mockResolvedValue({ rowErrors: { 0: { quantity: "Ingresa una cantidad mayor que 0, con hasta dos decimales." } } });
  const user = userEvent.setup();
  render(
    <DealItems
      dealId="d1"
      items={[{ id: "i1", description: "Web", quantity: "1", unitPrice: "10", taxRate: 15 }]}
      locked={false}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Guardar productos" }));
  expect(await screen.findByText(/cantidad mayor que 0/)).toBeInTheDocument();
  expect(screen.getByLabelText("Cantidad del producto 1")).toHaveAttribute("aria-invalid", "true");
});

test("un negocio ganado muestra sus productos sin poder editarlos", () => {
  render(
    <DealItems
      dealId="d1"
      items={[{ id: "i1", description: "Web", quantity: "1", unitPrice: "10", taxRate: 15 }]}
      locked
    />,
  );
  expect(screen.getByText("Reabre el negocio para cambiar sus productos.")).toBeInTheDocument();
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.queryByRole("button", { name: "Guardar productos" })).toBeNull();
});
