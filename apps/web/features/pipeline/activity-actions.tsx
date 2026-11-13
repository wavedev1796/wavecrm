"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ACTIVIDADES } from "@/content/actividades";
import { TIMELINE } from "@/content/timeline";
import { ActivityDialog, type Owner } from "../actividades/activity-dialog";
import { completeActivityAction, createActivityAction } from "./actions";

// Las partes interactivas del timeline. La lista se arma en el servidor (features/timeline/entries.ts): así las fechas
// se formatean una sola vez y no difieren entre el ICU de Node y el del navegador al hidratar.

export function CompleteButton({ dealId, activity }: Readonly<{ dealId: string; activity: { id: string; subject: string } }>) {
  const texto = TIMELINE;
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button
        variant="ghost"
        className="action-button action-button--success"
        loading={pending}
        aria-label={texto.completarDe(activity.subject)}
        onClick={() =>
          startTransition(async () => {
            const result = await completeActivityAction(dealId, activity.id);
            if (result.error) setError(result.error);
          })
        }
      >
        <Check aria-hidden />
        {texto.completar}
      </Button>
      {error && <Alert tone="error">{error}</Alert>}
    </>
  );
}

/**
 * Actividades del negocio en su ficha (P14, 2026-11-11): el mismo diálogo de la agenda, ya vinculado al negocio y con
 * su responsable por defecto, y el enlace a la agenda filtrada por este negocio. Un rechazado no admite actividades
 * nuevas (409 del API) hasta reversarlo, pero su agenda sí se puede ver.
 */
export function DealActivity({
  deal,
  owners,
}: Readonly<{ deal: { id: string; ownerId: string | null; status: string }; owners: Owner[] }>) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState("");
  const router = useRouter();
  return (
    <div className="deal-activity">
      <div className="deal-activity-actions">
        {deal.status !== "REJECTED" && (
          <Button
            variant="secondary"
            onClick={() => {
              setSaved("");
              setOpen(true);
            }}
          >
            <Plus aria-hidden />
            {ACTIVIDADES.formulario.registrar}
          </Button>
        )}
        <Link className="button button--ghost" href={"/actividades?dealId=" + encodeURIComponent(deal.id)}>
          <CalendarDays aria-hidden />
          {ACTIVIDADES.verEnAgenda}
        </Link>
      </div>
      {saved && <Alert tone="success">{saved}</Alert>}
      {open && (
        <ActivityDialog
          owners={owners}
          activity={{ assigneeId: deal.ownerId }}
          withDone
          inlineErrors
          onClose={() => setOpen(false)}
          onSubmit={async (data) => {
            const result = await createActivityAction(deal.id, data);
            if (result.ok) {
              setOpen(false);
              setSaved(result.message);
              router.refresh();
            }
            return result;
          }}
        />
      )}
    </div>
  );
}
