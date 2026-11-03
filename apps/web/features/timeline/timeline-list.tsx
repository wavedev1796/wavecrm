"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
}>;

/**
 * Historial paginado. La primera página llega del servidor ya formateada; «Ver más» agrega las siguientes.
 * En el negocio, las actividades pendientes se completan aquí; en el contacto, cada evento enlaza a su negocio.
 */
export function TimelineList({ kind, id, initial, members = [] }: Props) {
  const texto = TIMELINE;
  const failure = "error" in initial ? initial : null;
  const first = "error" in initial ? null : initial;
  // Al revalidar (actividad nueva o completada) llega otra primera página: se descarta lo cargado después.
  const start = { from: initial, more: [] as TimelineEntry[], cursor: first?.nextCursor ?? null, error: "" };
  const [loaded, setLoaded] = useState(start);
  if (loaded.from !== initial) setLoaded(start);
  const [pending, startTransition] = useTransition();

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

  return (
    <>
      {entries.length ? (
        <ol aria-live="polite" aria-busy={pending}>
          {entries.map((entry) => (
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
              {/* key: si la nota cambió (guardada aquí o por otra persona), los controles parten de lo nuevo. */}
              {entry.editable && (
                <NoteControls
                  key={entry.editable.content + entry.editable.mentionIds.join()}
                  note={entry.editable}
                  members={members}
                />
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p>{texto.vacio}</p>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      {cursor && (
        <Button type="button" variant="secondary" loading={pending} onClick={more}>
          {error ? texto.reintentar : texto.verMas}
        </Button>
      )}
    </>
  );
}
