// Códigos de los enums de Prisma (packages/database/prisma/schema.prisma) para web y API.
// Solo códigos: las etiquetas en español viven en apps/web/content/catalogos.ts.
// apps/web/content/catalogos.test.ts falla si este archivo y el schema se separan.
// DocumentType y DOCUMENT_TYPES ya viven en ecuador.ts.

export const USER_ROLES = ['ADMIN', 'VENDEDOR'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const DEAL_STATUSES = ['OPEN', 'WON', 'LOST'] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

export const ACTIVITY_TYPES = ['CALL', 'EMAIL', 'MEETING', 'TASK'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const QUOTE_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
