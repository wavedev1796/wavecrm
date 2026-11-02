import { expect, test } from "vitest";
import { toEntries } from "./entries";
import { event, pendingCall } from "./timeline-fixture";

const at = (day: string) => `2026-10-${day}T12:00:00.000Z`;
const action = (id: string, name: string, changes: object | null, day: string) =>
  event(id, at(day), { event: { action: name, changes: changes as Record<string, unknown> | null } });

test("cada tipo lleva su etiqueta, título, autor y fecha, en el orden del API", () => {
  const entries = toEntries([
    pendingCall,
    event("NOTE:n1", at("02"), { kind: "NOTE", author: null, note: { id: "n1", content: "Prefiere <b>correo</b>" } }),
    event("STAGE:h1", at("01"), { kind: "STAGE", stage: { from: null, to: { id: "s1", name: "Propuesta" }, reason: null } }),
    event("STAGE:h2", at("01"), {
      kind: "STAGE",
      stage: { from: { id: "s2", name: "Negociación" }, to: { id: "s1", name: "Contactado" }, reason: "El cliente pausó la compra" },
    }),
  ]);
  expect(entries.map((e) => e.id)).toEqual(["ACTIVITY:a1", "NOTE:n1", "STAGE:h1", "STAGE:h2"]);
  expect(entries[0]).toMatchObject({
    type: "Llamada",
    title: "Llamar a Maria",
    pending: { id: "a1", subject: "Llamar a Maria" },
    deal: { id: "d1", title: "Cuenta Andina" },
  });
  expect(entries[0]?.detail).toMatch(/^Pendiente · Zaith · 3 oct.* 2026.*7:00.* · Vence el 12 oct.* 2026$/);
  expect(entries[1]).toMatchObject({ type: "Nota", title: "Nota registrada", note: "Prefiere <b>correo</b>" });
  expect(entries[1]?.detail).toMatch(/^Usuario no disponible · /);
  expect(entries[2]).toMatchObject({ type: "Cambio de etapa", title: "Creado en Propuesta", note: null });
  expect(entries[3]).toMatchObject({ title: "Negociación → Contactado", note: "Motivo: El cliente pausó la compra" });
});

test("una actividad realizada no se completa ni muestra vencimiento", () => {
  const [done] = toEntries([
    event("ACTIVITY:a2", at("04"), {
      kind: "ACTIVITY",
      activity: {
        id: "a2",
        type: "MEETING",
        status: "COMPLETED",
        subject: "Demo",
        description: "Fue bien",
        dueAt: "2026-10-04T00:00:00.000Z",
        completedAt: at("04"),
        assignee: null,
      },
    }),
  ]);
  expect(done).toMatchObject({ type: "Reunión", title: "Demo", note: "Fue bien" });
  expect(done?.pending).toBeUndefined();
  expect(done?.detail).not.toMatch(/Vence/);
});

test("cierres, propuestas, reapertura y borrado dejan su evento; lo desconocido se omite", () => {
  const entries = toEntries([
    action("e1", "QUOTE_SENT", { quoteNumber: "COT-000001", total: "135.00", validUntil: "2026-11-30T00:00:00.000Z" }, "10"),
    action("e2", "QUOTE_SUPERSEDED", { quoteNumber: "COT-000001" }, "11"),
    action("e3", "QUOTE_ACCEPTED", { quoteNumber: "COT-000002", acceptanceNote: "Orden 55" }, "12"),
    action("e4", "LOST", { lossReason: "NEED_POSTPONED", followUpAt: "2027-01-18T00:00:00.000Z" }, "13"),
    action("e5", "REJECTED", { lossReason: "DO_NOT_CONTACT", quotes: ["COT-000002"], cancelledActivities: 2 }, "14"),
    action("e6", "QUOTE_FUTURO", {}, "15"),
    action("e7", "toString", {}, "15"),
    action("e8", "WON", { quoteNumber: "COT-000003" }, "16"),
    action("e9", "REOPENED", { from: "WON", reason: "Anuló la orden" }, "17"),
    action("e10", "LOST", { lossReason: "NEGOTIATION", lossDetail: "Precio" }, "18"),
    action("e11", "REJECTED", { quotes: ["COT-1", "COT-2"], cancelledActivities: 1 }, "19"),
    action("e12", "DELETED", { title: "Cuenta vieja", value: "50.00", lossReason: "COMMERCIAL_RISK", lossDetail: "Duplicado" }, "20"),
    action("e13", "WON", null, "21"),
    action("e14", "QUOTE_SENT", {}, "22"),
    action("e15", "REOPENED", {}, "23"),
    action("e16", "QUOTE_ACCEPTED", {}, "24"),
    action("e17", "QUOTE_SUPERSEDED", {}, "25"),
    action("e18", "DELETED", {}, "26"),
    action("e19", "LOST", {}, "26"),
    action("e20", "REJECTED", { quotes: [] }, "26"),
    event("EVENT:x", at("27"), {}),
    event("ACTIVITY:x", at("27"), { kind: "ACTIVITY" }),
    event("NOTE:x", at("27"), { kind: "NOTE" }),
    event("STAGE:x", at("27"), { kind: "STAGE" }),
    event("OTRO:x", at("27"), { kind: "OTRO" as never }),
  ]);
  expect(entries.map((e) => [e.type, e.title, e.note])).toEqual([
    ["Evento del negocio", expect.stringMatching(/^Propuesta COT-000001 enviada · .*135,00$/), expect.stringMatching(/^Vigente hasta 30 nov.* 2026$/)],
    ["Evento del negocio", "Propuesta COT-000001 desactualizada por cambios en los productos", null],
    ["Evento del negocio", "Propuesta COT-000002 aceptada", "Orden 55"],
    ["Evento del negocio", "Perdido · Necesidad aplazada", expect.stringMatching(/^Seguimiento programado para 18 ene.* 2027$/)],
    ["Evento del negocio", "Rechazado · Cliente solicita no ser contactado", "1 propuesta rechazada · 2 actividades canceladas"],
    ["Evento del negocio", "Ganado · cotización COT-000003", null],
    ["Evento del negocio", "Reabierto", "Motivo: Anuló la orden"],
    ["Evento del negocio", "Perdido · Problemas de negociación", "Precio"],
    ["Evento del negocio", "Rechazado · ", "2 propuestas rechazadas · 1 actividad cancelada"],
    ["Evento del negocio", "Negocio «Cuenta vieja» eliminado", "Motivo: Riesgo comercial · Duplicado"],
    ["Evento del negocio", "Ganado · cotización ", null],
    ["Evento del negocio", expect.stringMatching(/^Propuesta {2}enviada · .*0,00$/), null],
    ["Evento del negocio", "Reabierto", null],
    ["Evento del negocio", "Propuesta  aceptada", null],
    ["Evento del negocio", "Propuesta  desactualizada por cambios en los productos", null],
    ["Evento del negocio", "Negocio «» eliminado", null],
    ["Evento del negocio", "Perdido · ", null],
    ["Evento del negocio", "Rechazado · ", "0 propuestas rechazadas · 0 actividades canceladas"],
  ]);
});
