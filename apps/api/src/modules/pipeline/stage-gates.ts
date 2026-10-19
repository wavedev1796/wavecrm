import { Prisma } from "@wave/database";
import {
  TRANSITION_CHECKS,
  type DealStatus,
  type QuoteStatus,
  type StageRequirement,
  type TransitionCheck,
} from "@wave/shared";

// Reglas de transición entre etapas: una función pura, sin HTTP ni Prisma, que usan todos los caminos
// (arrastre, selector, edición, ganar, perder, reabrir y alta). Decide qué falta; el servicio escribe.

export type GateStage = {
  id: string;
  pipelineId: string;
  position: number;
  probability: number;
  requirements: StageRequirement[];
};
export type GateFacts = {
  status: DealStatus;
  /** Etapa actual; null en un alta. */
  stage: GateStage | null;
  contactId: string | null;
  ownerId: string | null;
  need: string | null;
  solution: string | null;
  budget: Prisma.Decimal.Value | null;
  budgetNote: string | null;
  expectedClose: Date | null;
  /** Hay una llamada, correo o reunión ya realizada. */
  hasInteraction: boolean;
  /** Hay una actividad pendiente con fecha de hoy en adelante. */
  hasNextActivity: boolean;
  /** Última propuesta que no está desactualizada. */
  quote: { status: QuoteStatus; total: Prisma.Decimal.Value } | null;
  /** Total con IVA de los productos; null sin productos. */
  itemsTotal: Prisma.Decimal.Value | null;
};
export type GateTarget =
  | { kind: "stage"; stage: GateStage }
  | { kind: "won"; stage: GateStage | null }
  | { kind: "lost" }
  | { kind: "reopen"; stage: GateStage };
export type GateInput = { reason?: string; closedAt?: Date; lossReason?: string };
export type Pending = { code: TransitionCheck; message: string };

export const CHECK_MESSAGES: Record<TransitionCheck, string> = {
  CONTACT: "Asocia un contacto con correo o teléfono.",
  OWNER: "Asigna un responsable.",
  INTERACTION: "Registra la primera interacción realizada: una llamada, un correo o una reunión.",
  NEED: "Documenta la necesidad del cliente.",
  NEXT_ACTIVITY: "Programa la próxima actividad con fecha de hoy en adelante.",
  SOLUTION: "Define la solución de interés.",
  BUDGET: "Registra el presupuesto o explica por qué aún no se conoce.",
  EXPECTED_CLOSE: "Indica la fecha estimada de cierre.",
  PROPOSAL_SENT: "Registra la propuesta comercial enviada.",
  ACCEPTANCE: "Registra la aceptación de la propuesta con su evidencia.",
  FINAL_AMOUNT:
    "El importe de la propuesta aceptada no coincide con el de los productos. Registra y acepta una nueva.",
  CLOSED_AT: "Ingresa la fecha real de cierre; no puede ser futura.",
  LOSS_REASON: "Elige el motivo de la pérdida.",
  REASON: "Indica el motivo del cambio.",
};

const filled = (text: string | null | undefined) => Boolean(text?.trim());

const MET: Record<StageRequirement, (facts: GateFacts) => boolean> = {
  CONTACT: (f) => Boolean(f.contactId), // el contacto ya trae correo o teléfono (CHECK de la base)
  OWNER: (f) => Boolean(f.ownerId),
  INTERACTION: (f) => f.hasInteraction,
  NEED: (f) => filled(f.need),
  NEXT_ACTIVITY: (f) => f.hasNextActivity,
  SOLUTION: (f) => filled(f.solution),
  BUDGET: (f) => f.budget != null || filled(f.budgetNote),
  EXPECTED_CLOSE: (f) => Boolean(f.expectedClose),
  PROPOSAL_SENT: (f) => f.quote?.status === "SENT" || f.quote?.status === "ACCEPTED",
};

const isOpenStage = (stage: GateStage) => stage.probability < 100;

/** Requisitos acumulados: los de todas las etapas abiertas del pipeline hasta la posición dada. */
function requirementsUpTo(stages: GateStage[], pipelineId: string, position: number) {
  return new Set(
    stages
      .filter((s) => s.pipelineId === pipelineId && isOpenStage(s) && s.position <= position)
      .flatMap((s) => s.requirements),
  );
}

/** Lo que falta para el cambio pedido, en el orden de TRANSITION_CHECKS. Vacío = permitido. */
export function pendingChecks(
  facts: GateFacts,
  target: GateTarget,
  stages: GateStage[],
  input: GateInput,
  today: Date,
): Pending[] {
  const missing = new Set<TransitionCheck>();
  const current = facts.stage;
  const require = (codes: Set<StageRequirement>) => {
    for (const code of codes) if (!MET[code](facts)) missing.add(code);
  };
  if (target.kind === "lost") {
    if (!input.lossReason) missing.add("LOSS_REASON");
  } else if (target.kind === "won") {
    // ponytail: el negocio cerrado no necesita seguimiento; pedirlo obligaría a inventar una actividad.
    const pipelineId = target.stage?.pipelineId ?? current?.pipelineId ?? "";
    const open = requirementsUpTo(stages, pipelineId, Number.POSITIVE_INFINITY);
    open.delete("NEXT_ACTIVITY");
    require(open);
    if (facts.quote?.status !== "ACCEPTED") missing.add("ACCEPTANCE");
    else if (facts.itemsTotal == null || !new Prisma.Decimal(facts.quote.total).equals(facts.itemsTotal))
      missing.add("FINAL_AMOUNT");
    if (!input.closedAt || input.closedAt > today) missing.add("CLOSED_AT");
  } else {
    const destination = target.stage;
    const advancing =
      !current ||
      current.pipelineId !== destination.pipelineId ||
      destination.position > current.position;
    if (advancing) require(requirementsUpTo(stages, destination.pipelineId, destination.position));
    const backwards = !advancing && destination.position < (current?.position ?? 0);
    if ((target.kind === "reopen" || facts.status !== "OPEN" || backwards) && !filled(input.reason))
      missing.add("REASON");
  }
  return TRANSITION_CHECKS.filter((code) => missing.has(code)).map((code) => ({
    code,
    message: CHECK_MESSAGES[code],
  }));
}
