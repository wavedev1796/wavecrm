import type { DealDetail } from "./types";

/** Negocio abierto con dos productos (chocolates 0 % y vinos 15 %): subtotal 120, IVA 15, total 135. */
export const baseDeal: DealDetail = {
  id: "d1",
  title: "Cuenta Andina",
  value: "120.00",
  currency: "USD",
  status: "OPEN",
  pipelineId: "p1",
  stageId: "s1",
  contactId: null,
  companyId: "e1",
  ownerId: "u1",
  expectedClose: null,
  closedAt: null,
  lossReason: null,
  lossDetail: null,
  createdAt: "2026-10-01T15:00:00.000Z",
  pipeline: { id: "p1", name: "Ventas" },
  stage: { id: "s1", name: "Propuesta", color: null, probability: 70 },
  contact: null,
  company: { id: "e1", name: "Comercial Andina", taxId: "1791234561001", email: null, phone: null },
  owner: { id: "u1", name: "Zaith" },
  _count: { items: 2 },
  items: [
    { id: "i1", description: "Chocolates", quantity: "2", unitPrice: "10", taxRate: 0 },
    { id: "i2", description: "Vinos", quantity: "1", unitPrice: "100", taxRate: 15 },
  ],
  quotes: [],
  activities: [],
  stageHistory: [],
  closures: [],
};
