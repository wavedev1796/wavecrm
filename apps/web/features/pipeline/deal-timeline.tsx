import { Clock3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TIMELINE } from "@/content/timeline";
import { NoteForm } from "../timeline/note-form";
import { TimelineList } from "../timeline/timeline-list";
import type { Member, TimelineResult } from "../timeline/types";
import { ActivityForm } from "./activity-actions";
import type { DealDetail } from "./types";

/** Actividades, notas, cambios de etapa y eventos del negocio, del más reciente al más antiguo (los ordena el API). */
export function DealTimeline({
  deal,
  timeline,
  members,
}: Readonly<{ deal: DealDetail; timeline: TimelineResult; members: Member[] }>) {
  return (
    <Card className="contact-related deal-timeline">
      <h3>
        <Clock3 aria-hidden />
        {TIMELINE.titulo}
      </h3>
      {/* Un rechazado no admite actividades nuevas (409 del API) hasta reabrirlo. Sin acceso al historial,
          el formulario sigue: registrar no depende de poder leer lo anterior. */}
      {deal.status !== "REJECTED" && <ActivityForm dealId={deal.id} />}
      <NoteForm kind="deals" id={deal.id} members={members} />
      <TimelineList kind="deals" id={deal.id} initial={timeline} members={members} />
    </Card>
  );
}
