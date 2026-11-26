import type { BillingStatus, BuyerParty, PaymentMethod } from "@wave/shared";

export type { BillingStatus };

/** `HandoffView` del API (R1): la fila de la entrega + número de cotización + número de factura derivado de la clave. */
export type HandoffView = {
  id: string;
  quoteId: string;
  status: BillingStatus;
  /** Comprador enviado: tipo e identificación, razón social, dirección, correo, teléfono. */
  buyer: { identificacion?: string; razonSocial?: string; email?: string };
  paymentMethod: PaymentMethod;
  accessKey: string | null;
  sequential: string | null;
  authorizationNumber: string | null;
  authorizedAt: string | null;
  /** Mensajes del SRI o del error, tal como llegan. */
  messages: unknown[];
  attempts: number;
  quoteNumber: string;
  /** `EEE-PPP-SSSSSSSSS`; null sin clave de acceso. */
  invoiceNumber: string | null;
};

/** `GET /deals/:id/billing`: la entrega (si existe) y a quién se puede facturar (null: a nadie). */
export type BillingInfo = {
  handoff: HandoffView | null;
  buyer: { options: BuyerParty[]; default: BuyerParty } | null;
};

/** `error` es el texto de la carga fallida: la tarjeta lo muestra y la ficha sigue. */
export type BillingLoad = BillingInfo | { error: string };

export type BillingResult = { error?: string; handoff?: HandoffView };
