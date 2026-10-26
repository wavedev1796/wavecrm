// Códigos de los enums de Prisma (packages/database/prisma/schema.prisma) para web y API.
// Solo códigos: las etiquetas en español viven en apps/web/content/catalogos.ts.
// apps/web/content/catalogos.test.ts falla si este archivo y el schema se separan.
// DocumentType y DOCUMENT_TYPES ya viven en ecuador.ts.

export const USER_ROLES = ['ADMIN', 'VENDEDOR'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// LOST sigue en el tablero (recuperable); REJECTED va a la papelera.
export const DEAL_STATUSES = ['OPEN', 'WON', 'LOST', 'REJECTED'] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

export const ACTIVITY_TYPES = ['CALL', 'EMAIL', 'MEETING', 'TASK'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const QUOTE_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

// Motivo de un cierre (enum LossReason), perdido o rechazado. Cada cierre elige de su lista; OTHER vale para los dos.
export const CLOSE_REASONS = [
  'NEGOTIATION',
  'COMPETITOR',
  'NO_BUDGET',
  'NO_RESPONSE',
  'BAD_TIMING',
  'OTHER',
  'NEED_POSTPONED',
  'PRIORITY_CHANGE',
  'CLIENT_DECLINED',
  'PRODUCT_MISMATCH',
  'REQUIREMENTS_UNMET',
  'COMMERCIAL_RISK',
  'OUT_OF_SCOPE',
  'DO_NOT_CONTACT',
] as const;
export type LossReason = (typeof CLOSE_REASONS)[number];

// Perdido: la venta no se concretó por algo que puede cambiar.
export const LOSS_REASONS = [
  'NO_BUDGET',
  'COMPETITOR',
  'BAD_TIMING',
  'NO_RESPONSE',
  'NEED_POSTPONED',
  'NEGOTIATION',
  'PRIORITY_CHANGE',
  'OTHER',
] as const satisfies readonly LossReason[];

// Rechazado: decisión explícita de no continuar, del cliente o de la empresa.
export const REJECTION_REASONS = [
  'CLIENT_DECLINED',
  'PRODUCT_MISMATCH',
  'REQUIREMENTS_UNMET',
  'COMMERCIAL_RISK',
  'OUT_OF_SCOPE',
  'DO_NOT_CONTACT',
  'OTHER',
] as const satisfies readonly LossReason[];

// Requisitos para entrar a una etapa (Stage.requirements). Cada etapa elige los suyos; se suman los de las anteriores.
export const STAGE_REQUIREMENTS = [
  'CONTACT',
  'OWNER',
  'INTERACTION',
  'NEED',
  'NEXT_ACTIVITY',
  'SOLUTION',
  'BUDGET',
  'EXPECTED_CLOSE',
  'PROPOSAL_SENT',
] as const;
export type StageRequirement = (typeof STAGE_REQUIREMENTS)[number];

// Pendientes de un cambio de etapa: los requisitos de etapa, las condiciones fijas de cierre y los datos que pide el cambio.
export const TRANSITION_CHECKS = [
  ...STAGE_REQUIREMENTS,
  'ACCEPTANCE',
  'FINAL_AMOUNT',
  'CLOSED_AT',
  'LOSS_REASON',
  'REJECTION_REASON',
  'REASON',
] as const;
export type TransitionCheck = (typeof TRANSITION_CHECKS)[number];

// IVA de un producto: entero de 0 a 100 (CHECK "DealItem_taxRate_range"). Solo sugerencias; la primera es la por defecto.
export const IVA_SUGGESTIONS = [15, 12, 0] as const;
