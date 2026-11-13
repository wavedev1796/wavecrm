"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ACTIVIDADES } from "@/content/actividades";
import { TIPO_ACTIVIDAD } from "@/content/catalogos";
import { formatDateTime } from "@/lib/format";
import { describeActivityChanges } from "../timeline/entries";
import { loadActivityHistory, type ActivityHistoryAction, type ActivityHistoryResult } from "./actions";
import { ActivityTypeIcon } from "./activity-type-icon";

const text = ACTIVIDADES.historial;
const ACTIONS: ActivityHistoryAction[] = ["CREATED", "UPDATED", "COMPLETED", "CANCELLED", "DELETED"];
const TONES = {
  CREATED: "blue",
  UPDATED: "blue",
  COMPLETED: "success",
  CANCELLED: "warning",
  DELETED: "danger",
} as const;

export function ActivityHistory() {
  const [action, setAction] = useState<ActivityHistoryAction | "">("");
  const [result, setResult] = useState<ActivityHistoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setResult(null);
    setPageError("");
    loadActivityHistory(action || undefined).then((next) => {
      if (current) setResult(next);
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => {
      current = false;
    };
  }, [action, retry]);

  const nextCursor = result && "data" in result ? result.nextCursor : null;
  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setPageError("");
    const next = await loadActivityHistory(action || undefined, nextCursor);
    if ("error" in next) setPageError(next.error);
    else setResult((current) =>
      current && "data" in current
        ? { data: [...current.data, ...next.data], nextCursor: next.nextCursor }
        : next,
    );
    setLoadingMore(false);
  };

  return (
    <section className="activity-history" aria-labelledby="activity-history-title" aria-busy={loading || loadingMore}>
      <header className="activity-history-header">
        <div>
          <h2 id="activity-history-title">{text.titulo}</h2>
          <p>{text.descripcion}</p>
        </div>
        <label>
          <span>{text.filtrar}</span>
          <Select
            aria-label={text.filtrar}
            value={action}
            onChange={(event) => setAction(event.target.value as ActivityHistoryAction | "")}
          >
            <option value="">{text.todas}</option>
            {ACTIONS.map((value) => <option key={value} value={value}>{text.acciones[value]}</option>)}
          </Select>
        </label>
      </header>

      {loading && <output className="activity-history-loading">{text.cargando}</output>}
      {!loading && result && "error" in result && (
        <div className="activity-history-error">
          <Alert tone="error">{result.error}</Alert>
          <Button type="button" variant="secondary" onClick={() => setRetry((value) => value + 1)}>{text.reintentar}</Button>
        </div>
      )}
      {!loading && result && "data" in result && !result.data.length && (
        <div className="activity-history-empty card">{text.vacio}</div>
      )}
      {!loading && result && "data" in result && result.data.length > 0 && (
        <ol className="activity-history-list">
          {result.data.map((entry) => {
            const changes = describeActivityChanges(entry.changes);
            return (
              <li key={entry.id} className="activity-history-entry card">
                <div className="activity-history-date">
                  <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
                </div>
                <div className="activity-history-content">
                  <div className="activity-history-badges">
                    <Badge tone={TONES[entry.kind]}>{text.acciones[entry.kind]}</Badge>
                    {entry.activityType && (
                      <span className="activity-history-type">
                        <ActivityTypeIcon type={entry.activityType} />
                        {TIPO_ACTIVIDAD[entry.activityType]}
                      </span>
                    )}
                  </div>
                  <h3>{entry.subject}</h3>
                  {changes && <p>{changes}</p>}
                  <small>{text.por(entry.author?.name ?? text.usuario)}</small>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {pageError && <Alert tone="error">{pageError}</Alert>}
      {!loading && nextCursor && (
        <Button
          type="button"
          variant="secondary"
          className="activity-history-more"
          loading={loadingMore}
          onClick={loadMore}
        >
          {text.verMas}
        </Button>
      )}
      {pageError && nextCursor && (
        <Button type="button" variant="secondary" onClick={loadMore}>{text.reintentar}</Button>
      )}
    </section>
  );
}
