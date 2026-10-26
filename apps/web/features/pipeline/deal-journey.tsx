import Link from "next/link";
import { ESTADO_NEGOCIO, MOTIVO_CIERRE } from "@/content/catalogos";
import { RECORRIDO } from "@/content/pipeline";
import { formatDay, formatMoney } from "@/lib/format";
import type { JourneyDeal } from "./types";

/** Negocio en la ficha de su contacto o empresa: etapa y estado, y su último paso (movimiento o cierre con motivo). */
export function DealJourney({ deal }: Readonly<{ deal: JourneyDeal }>) {
  const move = deal.stageHistory?.[0];
  const step =
    deal.status === "OPEN"
      ? move &&
        (move.fromStage
          ? RECORRIDO.movido(move.fromStage.name, move.toStage.name, formatDay(move.changedAt))
          : RECORRIDO.creado(move.toStage.name, formatDay(move.changedAt)))
      : [deal.closedAt && RECORRIDO.cerrado(formatDay(deal.closedAt)), deal.lossReason && MOTIVO_CIERRE[deal.lossReason]]
          .filter(Boolean)
          .join(" · ");
  return (
    <article>
      <div>
        <Link href={`/pipeline/${deal.id}`}>
          <strong>{deal.title}</strong>
        </Link>
        <span>
          {deal.stage.name} · {ESTADO_NEGOCIO[deal.status]}
        </span>
        {step && <span>{step}</span>}
      </div>
      <b>{formatMoney(deal.value, deal.currency)}</b>
    </article>
  );
}
