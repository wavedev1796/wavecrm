import { Clock3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TIMELINE } from "@/content/timeline";
import { TimelineList } from "../timeline/timeline-list";
import type { TimelineResult } from "../timeline/types";
import { ActivityForm } from "./activity-actions";
import type { DealDetail } from "./types";

/** Actividades, cambios de etapa y eventos del negocio, del más reciente al más antiguo (los ordena el API). */
export function DealTimeline({ deal, timeline }: Readonly<{ deal: DealDetail; timeline: TimelineResult }>) {
  return (
    <Card className="contact-related deal-timeline">
      <h3>
        <Clock3 aria-hidden />
        {TIMELINE.titulo}
      </h3>
      {/* Un rechazado no admite actividades nuevas (409 del API) hasta reabrirlo. Sin acceso al historial,
          el formulario sigue: registrar no depende de poder leer lo anterior. */}
      {deal.status !== "REJECTED" && <ActivityForm dealId={deal.id} />}
      <TimelineList kind="deals" id={deal.id} initial={timeline} />
    </Card>
  );
}
