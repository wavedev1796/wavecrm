import type {
  ActivityStatus,
  ActivityType,
  DealStatus,
  DocumentType,
  LossReason,
  QuoteStatus,
  UserRole,
} from "@wave/shared";

// Etiquetas de los códigos de @wave/shared. `satisfies` obliga a cubrir cada código:
// si el schema suma un estado, TypeScript marca aquí la etiqueta que falta.
// Cada etiqueta llega con la pantalla que la muestra.

export const ROL_USUARIO = {
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
} as const satisfies Record<UserRole, string>;

export const ESTADO_NEGOCIO = {
  OPEN: "Abierto",
  WON: "Ganado",
  LOST: "Perdido",
} as const satisfies Record<DealStatus, string>;

export const TIPO_ACTIVIDAD = {
  CALL: "Llamada",
  EMAIL: "Correo",
  MEETING: "Reunión",
  TASK: "Tarea",
} as const satisfies Record<ActivityType, string>;

export const TIPO_DOCUMENTO = {
  CEDULA: { etiqueta: "Cédula", ejemplo: "1712345675" },
  RUC: { etiqueta: "RUC", ejemplo: "1712345675001" },
  PASAPORTE: { etiqueta: "Pasaporte", ejemplo: "AB123456" },
} as const satisfies Record<DocumentType, { etiqueta: string; ejemplo: string }>;

export const MOTIVO_PERDIDA = {
  PRICE: "Precio",
  COMPETITOR: "Eligió a la competencia",
  NO_BUDGET: "Sin presupuesto",
  NO_RESPONSE: "Sin respuesta del cliente",
  BAD_TIMING: "No era el momento",
  OTHER: "Otro",
} as const satisfies Record<LossReason, string>;

export const ESTADO_ACTIVIDAD = {
  PENDING: "Pendiente",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
} as const satisfies Record<ActivityStatus, string>;

export const ESTADO_COTIZACION = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
} as const satisfies Record<QuoteStatus, string>;
