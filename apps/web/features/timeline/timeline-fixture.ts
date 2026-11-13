import type { TimelineEntry, TimelineEvent } from "./types";

const zaith = { id: "u1", name: "Zaith" };

/** Evento del API con los campos comunes; cada prueba agrega su carga (activity, note, stage o event). */
export const event = (id: string, at: string, rest: Partial<TimelineEvent>): TimelineEvent => ({
  id,
  kind: "EVENT",
  at,
  author: zaith,
  deal: { id: "d1", title: "Cuenta Andina" },
  ...rest,
});

export const pendingCall = event("ACTIVITY:a1", "2026-10-03T12:00:00.000Z", {
  kind: "ACTIVITY",
  activity: {
    id: "a1",
    type: "CALL",
    status: "PENDING",
    subject: "Llamar a Maria",
    description: null,
    // Un día sin hora se guarda a las 00:00 de Ecuador (CRM-22).
    dueAt: "2026-10-12T05:00:00.000Z",
    completedAt: null,
    assignee: zaith,
  },
});

/** Entrada ya armada para la lista. */
export const entry = (id: string, rest: Partial<TimelineEntry> = {}): TimelineEntry => ({
  id,
  type: "Nota",
  title: "Título " + id,
  detail: "Zaith · 3 oct 2026",
  note: null,
  deal: null,
  ...rest,
});

/** Respuesta de `GET .../timeline`. */
export const apiPage = (data: TimelineEvent[], nextCursor: string | null = null) => ({
  data,
  meta: { limit: 20, nextCursor },
});
