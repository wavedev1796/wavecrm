import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { baseDeal } from "../pipeline/deal-fixture";
import { emailBillingAction, refreshBillingAction, reissueBillingAction, sendBillingAction } from "./actions";
import { BillingCard } from "./billing-card";
import type { BillingInfo, BillingStatus, HandoffView } from "./types";

vi.mock("./actions", () => ({
  sendBillingAction: vi.fn(),
  refreshBillingAction: vi.fn(),
  reissueBillingAction: vi.fn(),
  emailBillingAction: vi.fn(),
}));
const send = vi.mocked(sendBillingAction);
const refresh = vi.mocked(refreshBillingAction);
const reissue = vi.mocked(reissueBillingAction);
const email = vi.mocked(emailBillingAction);

const deal = { ...baseDeal, status: "WON" as const, contact: { id: "c1", firstName: "Ana", lastName: "Paz", email: null, phone: null } };
const handoff = (status: BillingStatus, extra: Partial<HandoffView> = {}): HandoffView => ({
  id: "h1",
  quoteId: "q1",
  status,
  buyer: { identificacion: "1792458123001", tipoIdentificacion: "04", razonSocial: "GRUPO ANDINO S.A.", email: "compras@andino.ec" },
  paymentMethod: "20",
  accessKey: null,
  sequential: null,
  authorizationNumber: null,
  authorizedAt: null,
  messages: [],
  attempts: 1,
  quoteNumber: "COT-000034",
  invoiceNumber: null,
  ...extra,
});
const delivered = { accessKey: "2011202601".padEnd(49, "0"), invoiceNumber: "001-001-000000012" };
const two: BillingInfo["buyer"] = { options: ["COMPANY", "CONTACT"], default: "COMPANY" };
const loaded = (h: HandoffView | null, buyer = two) => ({ handoff: h, buyer });
const view = (h: HandoffView | null, buyer = two) => render(<BillingCard deal={deal} load={loaded(h, buyer)} />);

test("PENDING: insignia «Enviando», número pendiente y se puede reintentar", () => {
  view(handoff("PENDING"));
  expect(screen.getByText("Enviando")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Consultar" })).toBeNull();
});

test("sin a quién facturar (buyer null): sin entrega no ofrece enviar; con entrega fallida no ofrece reintentar ni reemitir", () => {
  const { unmount } = render(<BillingCard deal={deal} load={{ handoff: null, buyer: null }} />);
  expect(screen.queryByRole("button", { name: "Enviar a facturación" })).toBeNull();
  unmount();
  render(<BillingCard deal={deal} load={{ handoff: handoff("FAILED", { messages: ["RUC inválido"] }), buyer: null }} />);
  expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  expect(screen.getByText("RUC inválido")).toBeInTheDocument();
});

test("sin entrega: «Enviar a facturación» abre el diálogo con dos compradores y Transferencia elegida", async () => {
  send.mockImplementation(() => new Promise(() => {}));
  const user = userEvent.setup();
  view(null);
  await user.click(screen.getByRole("button", { name: "Enviar a facturación" }));
  const dialog = screen.getByRole("dialog", { name: "Enviar a facturación" });
  const group = within(dialog).getByRole("group", { name: "Facturar a" });
  expect(within(group).getAllByRole("radio")).toHaveLength(2);
  expect(within(group).getByRole("radio", { name: /Empresa/ })).toBeChecked();
  expect(within(dialog).getByRole("combobox", { name: /Forma de pago/ })).toHaveValue("20");
  const submit = within(dialog).getByRole("button", { name: "Enviar a facturación" });
  await user.click(submit);
  expect(submit).toBeDisabled();
  const [dealId, form] = send.mock.calls[0]!;
  expect([dealId, form.get("buyer"), form.get("paymentMethod")]).toEqual(["d1", "COMPANY", "20"]);
});

test("con un solo comprador posible no se pregunta: se dice a quién se factura", async () => {
  const user = userEvent.setup();
  view(null, { options: ["CONTACT"], default: "CONTACT" });
  await user.click(screen.getByRole("button", { name: "Enviar a facturación" }));
  const dialog = screen.getByRole("dialog", { name: "Enviar a facturación" });
  expect(within(dialog).queryByRole("radio")).toBeNull();
  expect(within(dialog).getByText(/Se facturará a/)).toHaveTextContent("Ana Paz");
});

test("enviar con éxito cierra el diálogo y deja la tarjeta con el estado nuevo", async () => {
  send.mockResolvedValue({ handoff: handoff("SENT", delivered) });
  const user = userEvent.setup();
  const { rerender } = view(null);
  await user.click(screen.getByRole("button", { name: "Enviar a facturación" }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Enviar a facturación" }));
  expect(await screen.findByText("Enviada a facturación.")).toBeInTheDocument();
  // La acción revalida la ficha: el estado nuevo llega como props.
  rerender(<BillingCard deal={deal} load={loaded(handoff("SENT", delivered))} />);
  expect(screen.getByRole("button", { name: "Consultar estado" })).toBeInTheDocument();
  expect(screen.getByText("En el SRI")).toBeInTheDocument();
});

test("un error del API se queda en el diálogo, que sigue abierto", async () => {
  send.mockResolvedValue({ error: "No se pudo contactar a Wave Billing." });
  const user = userEvent.setup();
  view(null);
  await user.click(screen.getByRole("button", { name: "Enviar a facturación" }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Enviar a facturación" }));
  expect(await within(screen.getByRole("dialog")).findByText("No se pudo contactar a Wave Billing.")).toBeInTheDocument();
});

test("FAILED: mensaje y «Reintentar», sin PDF ni XML", () => {
  view(handoff("FAILED", { messages: ["No se pudo contactar a Wave Billing."] }));
  expect(screen.getByText("No se pudo contactar a Wave Billing.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Ver PDF" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Descargar XML" })).toBeNull();
});

test("SENT: «Consultar estado» llama al API y muestra el resultado; hay PDF y XML", async () => {
  refresh.mockResolvedValue({ handoff: handoff("AUTHORIZED", { ...delivered, authorizationNumber: "2011202601" }) });
  const user = userEvent.setup();
  const { rerender } = view(handoff("SENT", delivered));
  const pdf = screen.getByRole("link", { name: "Ver PDF" });
  expect(pdf).toHaveAttribute("href", "/api/deals/d1/billing/ride");
  expect(pdf).toHaveAttribute("target", "_blank");
  expect(pdf).toHaveAttribute("rel", "noopener");
  const xml = screen.getByRole("link", { name: "Descargar XML" });
  expect(xml).toHaveAttribute("href", "/api/deals/d1/billing/xml");
  expect(xml).toHaveAttribute("download");
  await user.click(screen.getByRole("button", { name: "Consultar estado" }));
  expect(await screen.findByText("Estado consultado.")).toBeInTheDocument();
  expect(refresh).toHaveBeenCalledWith("d1");
  rerender(<BillingCard deal={deal} load={loaded(handoff("AUTHORIZED", delivered))} />);
  expect(screen.getByText("Autorizada")).toBeInTheDocument();
});

test("RETURNED: mensaje del SRI y «Reemitir» con el aviso de número nuevo", async () => {
  reissue.mockResolvedValue({ handoff: handoff("SENT", delivered) });
  const user = userEvent.setup();
  view(handoff("RETURNED", { ...delivered, messages: ["RUC no habilitado."] }));
  expect(screen.getByText("RUC no habilitado.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ver PDF" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Reemitir" }));
  const dialog = screen.getByRole("dialog", { name: "Reemitir la factura" });
  expect(within(dialog).getByText("Se generará una factura nueva con otro número.")).toBeInTheDocument();
  await user.click(within(dialog).getByRole("radio", { name: /Contacto/ }));
  await user.click(within(dialog).getByRole("button", { name: "Reemitir" }));
  await waitFor(() => expect(reissue).toHaveBeenCalled());
  expect(reissue.mock.calls[0]![1].get("buyer")).toBe("CONTACT");
});

test("AUTHORIZED: número de factura, autorización y «Reenviar por correo» con el correo del comprador", async () => {
  email.mockResolvedValue({ handoff: handoff("AUTHORIZED", delivered) });
  const user = userEvent.setup();
  view(handoff("AUTHORIZED", { ...delivered, authorizationNumber: "2011202601AUTH" }));
  expect(screen.getByText(/Factura 001-001-000000012 · COT-000034/)).toBeInTheDocument();
  expect(screen.getByText(/Autorización: 2011202601AUTH/)).toBeInTheDocument();
  expect(screen.getByText(/GRUPO ANDINO S.A. \(RUC 1792458123001\)/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Reenviar por correo" }));
  const dialog = screen.getByRole("dialog", { name: "Reenviar la factura por correo" });
  expect(within(dialog).getByLabelText("Correo de destino")).toHaveValue("compras@andino.ec");
  await user.click(within(dialog).getByRole("button", { name: "Reenviar por correo" }));
  await waitFor(() => expect(email).toHaveBeenCalled());
  expect(email.mock.calls[0]![1].get("email")).toBe("compras@andino.ec");
  expect(await screen.findByText("Factura reenviada por correo.")).toBeInTheDocument();
});

test("un mensaje de Billing que es objeto muestra su `mensaje` con la información adicional", () => {
  view(handoff("RETURNED", { ...delivered, messages: [{ mensaje: "RUC no habilitado.", informacionAdicional: "Revisa el emisor." }, { codigo: 7 }] }));
  expect(screen.getByText("RUC no habilitado. Revisa el emisor.")).toBeInTheDocument();
  expect(screen.getByText('{"codigo":7}')).toBeInTheDocument();
});

test("si la carga falló, la tarjeta muestra el error", () => {
  render(<BillingCard deal={deal} load={{ error: "No pudimos cargar la facturación." }} />);
  expect(screen.getByText("No pudimos cargar la facturación.")).toBeInTheDocument();
  expect(screen.queryByRole("button")).toBeNull();
});
