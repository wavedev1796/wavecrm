"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/form/form-dialog";
import { COMUN } from "@/content/comun";
import { TIMELINE } from "@/content/timeline";
import { CompleteButton } from "../pipeline/activity-actions";
import { loadTimeline } from "./actions";
import { NoteControls } from "./note-form";
import type { Member, TimelineEntry, TimelineResult } from "./types";

type Props = Readonly<{
  kind: "deals" | "contacts";
  id: string;
  initial: TimelineResult;
  /** Miembros que se pueden mencionar al editar una nota. */
  members?: Member[];
  /** Renderiza el historial completo dentro del diálogo, conservando la paginación. */
  fullHistory?: boolean;
}>;

/**
 * Historial paginado. La primera página llega del servidor ya formateada; «Ver más» agrega las siguientes.
 * En el negocio, las actividades pendientes se completan aquí; en el contacto, cada evento enlaza a su negocio.
 */
export function TimelineList({ kind, id, initial, members = [], fullHistory = false }: Props) {
  const texto = TIMELINE;
  const failure = "error" in initial ? initial : null;
  const first = "error" in initial ? null : initial;
  // Al revalidar (actividad nueva o completada) llega otra primera página: se descarta lo cargado después.
  const start = { from: initial, more: [] as TimelineEntry[], cursor: first?.nextCursor ?? null, error: "" };
  const [loaded, setLoaded] = useState(start);
  if (loaded.from !== initial) setLoaded(start);
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!first) return <Alert tone={failure?.forbidden ? "note" : "error"}>{failure?.error}</Alert>;
  // Si entre páginas entró un evento nuevo, la siguiente puede repetir el último: cada id se pinta una vez.
  const seen = new Set<string>();
  const entries = [...first.entries, ...loaded.more].filter((entry) => !seen.has(entry.id) && seen.add(entry.id));
  const { cursor, error } = loaded;

  const more = () =>
    startTransition(async () => {
      const result = await loadTimeline(kind, id, cursor).catch(() => ({ error: COMUN.errores.conexion }));
      // Una respuesta que llega después de revalidar pertenece a la lista anterior: se ignora.
      setLoaded((state) => {
        if (state.from !== initial) return state;
        if ("error" in result) return { ...state, error: result.error };
        return { ...state, more: [...state.more, ...result.entries], cursor: result.nextCursor, error: "" };
      });
    });

  const list = (visible: TimelineEntry[], interactive: boolean) => (
    <ol aria-live="polite" aria-busy={pending}>
      {visible.map((entry) => (
        <li key={entry.id}>
          <div>
            <Badge tone="neutral">{entry.type}</Badge>
            <strong>{entry.title}</strong>
            {kind === "contacts" && entry.deal && (
              <Link href={"/pipeline/" + encodeURIComponent(entry.deal.id)}>{entry.deal.title}</Link>
            )}
            <span>{entry.detail}</span>
            {/* Texto plano: React escapa la nota, nunca se interpreta como HTML. */}
            {entry.note && <p>{entry.note}</p>}
          </div>
          {kind === "deals" && entry.pending && <CompleteButton dealId={id} activity={entry.pending} />}
          {/* Los controles de notas viven en el historial completo para evitar duplicarlos en la vista previa. */}
          {interactive && entry.editable && (
            <NoteControls
              key={entry.editable.content + entry.editable.mentionIds.join()}
              note={entry.editable}
              members={members}
            />
          )}
        </li>
      ))}
    </ol>
  );

  if (fullHistory) return (
    <div className="timeline-full-content">
      {entries.length ? list(entries, true) : <p>{texto.vacio}</p>}
      {error && <Alert tone="error">{error}</Alert>}
      {cursor && (
        <Button type="button" variant="secondary" loading={pending} onClick={more}>
          {error ? texto.reintentar : texto.verMas}
        </Button>
      )}
    </div>
  );

  const preview = entries.slice(0, 5);
  const hasMore = entries.length > preview.length || Boolean(cursor);

  return (
    <>
      {entries.length ? (
        <>
          <div className="timeline-preview-heading">
            <span>{texto.ultimosRegistros}</span>
            {hasMore && (
              <Button type="button" variant="ghost" onClick={() => { setHistoryOpen(true); dialog.current?.showModal(); }}>
                {texto.abrirHistorial}
              </Button>
            )}
          </div>
          {list(preview, !hasMore)}
        </>
      ) : (
        <p>{texto.vacio}</p>
      )}
      <FormDialog dialogRef={dialog} label={texto.historialCompleto} closeLabel={texto.cerrarHistorial} onClose={() => setHistoryOpen(false)}>
        {historyOpen && (
          <div className="timeline-history-dialog">
            <header className="deal-dialog-header">
              <span className="field-hint">{texto.titulo}</span>
              <h2>{texto.historialCompleto}</h2>
              <p>{texto.historialCompletoAyuda}</p>
            </header>
            <TimelineList kind={kind} id={id} initial={initial} members={members} fullHistory />
          </div>
        )}
      </FormDialog>
    </>
  );
}
