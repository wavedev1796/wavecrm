import type {
  ActivityType,
  DealStatus,
  DocumentType,
  UserRole,
} from "@wave/shared";

// Etiquetas de los códigos de @wave/shared. `satisfies` obliga a cubrir cada código:
// si el schema suma un estado, TypeScript marca aquí la etiqueta que falta.
// Las de ActivityStatus y QuoteStatus llegan con la pantalla que las muestre.

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
