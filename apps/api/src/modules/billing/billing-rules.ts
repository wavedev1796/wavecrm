import { UnprocessableEntityException } from "@nestjs/common";
import { Prisma, type BillingStatus } from "@wave/database";
import { TAX_CODES, type BuyerParty } from "@wave/shared";
import { dealTotals } from "../pipeline/deal-rules";

export type Buyer = {
  tipoIdentificacion: string;
  identificacion: string;
  razonSocial: string;
  direccion: string;
  email?: string;
  telefono?: string;
};

export type CompanyFacts = {
  name: string;
  legalName: string | null;
  taxId: string;
  address: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
};

export type ContactFacts = {
  firstName: string;
  lastName: string;
  documentType: "CEDULA" | "RUC" | "PASAPORTE";
  documentId: string;
  city: string | null;
  email: string | null;
  phone: string | null;
};

export type InvoiceLine = {
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  ivaTarifa: number;
  ivaCodigo: string;
};

const NO_ITEMS =
  "Esta cotización no guarda sus productos; registra y acepta una nueva.";
const DOCUMENT_CODES = { CEDULA: "05", RUC: "04", PASAPORTE: "06" } as const;

/** Quién puede recibir la factura: la empresa (su taxId es RUC), o el contacto con RUC; sin RUC en ninguno, el contacto. */
export function buyerOptions(
  company: CompanyFacts | null,
  contact: ContactFacts | null,
): { options: BuyerParty[]; default: BuyerParty } | null {
  const options: BuyerParty[] = [];
  if (company) options.push("COMPANY");
  if (contact && (!company || contact.documentType === "RUC")) options.push("CONTACT");
  const [first] = options;
  return first ? { options, default: first } : null;
}

/** Los datos opcionales que no existen salen como clave ausente, no como null ni "". */
const optional = (key: "email" | "telefono", value: string | null | undefined) =>
  value ? { [key]: value } : {};

export function toBuyer(
  party: BuyerParty,
  company: CompanyFacts | null,
  contact: ContactFacts | null,
): Buyer {
  if (party === "COMPANY" && company) {
    return {
      tipoIdentificacion: "04",
      identificacion: company.taxId,
      razonSocial: company.legalName || company.name,
      direccion: company.address || company.city || "Ecuador",
      ...optional("email", company.email || contact?.email),
      ...optional("telefono", company.phone),
    };
  }
  if (party === "CONTACT" && contact) {
    return {
      tipoIdentificacion: DOCUMENT_CODES[contact.documentType],
      identificacion: contact.documentId,
      razonSocial: `${contact.firstName} ${contact.lastName}`,
      direccion: contact.city || "Ecuador",
      ...optional("email", contact.email),
      ...optional("telefono", contact.phone),
    };
  }
  throw new UnprocessableEntityException("No hay a quién facturar.");
}

type StoredItem = {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: number;
  discountRate: number;
  product: { code: string } | null;
};

/** Líneas de la factura desde `Quote.items`; el descuento sale del redondeo de `dealTotals` para que el total coincida. */
export function toInvoiceLines(items: unknown): InvoiceLine[] {
  if (!Array.isArray(items) || !items.length) throw new UnprocessableEntityException(NO_ITEMS);
  return (items as StoredItem[]).map((item, index) => {
    const ivaCodigo = TAX_CODES[item.taxRate];
    if (!ivaCodigo) {
      throw new UnprocessableEntityException(
        `La línea «${item.description}» tiene IVA de ${item.taxRate} %, que aún no se puede facturar.`,
      );
    }
    const gross = new Prisma.Decimal(item.quantity).times(item.unitPrice).toDecimalPlaces(2);
    return {
      codigoPrincipal: item.product?.code || `ITEM-${index + 1}`,
      descripcion: item.description,
      cantidad: Number(item.quantity),
      precioUnitario: Number(item.unitPrice),
      descuento: gross.minus(dealTotals([item]).subtotal).toNumber(),
      ivaTarifa: item.taxRate,
      ivaCodigo,
    };
  });
}

const STATUSES = new Map<string, BillingStatus>([
  ["AUTORIZADO", "AUTHORIZED"],
  ["ENVIADA", "SENT"],
  ["DEVUELTA", "RETURNED"],
  ["NO_AUTORIZADO", "NOT_AUTHORIZED"],
]);

/** Estado de Billing → estado guardado; lo desconocido queda como enviada. */
export const billingStatus = (estado: string): BillingStatus => STATUSES.get(estado) ?? "SENT";
