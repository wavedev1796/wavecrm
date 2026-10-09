"use client";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/format";
import { dealHistoryAction } from "./actions";
import type { HistoryItem } from "./types";
export function DealHistory({ id }: Readonly<{ id: string }>) {
  const [result, setResult] = useState<{
    data?: HistoryItem[];
    error?: string;
  } | null>(null);
  useEffect(() => {
    let current = true;
    dealHistoryAction(id).then((value) => {
      if (current) setResult(value);
    });
    return () => {
      current = false;
    };
  }, [id]);
  return (
    <section className="deal-history" aria-label="Historial de etapas">
      <h3>Historial de etapas</h3>
      {!result && <output>Cargando historial...</output>}
      {result?.error && <Alert tone="error">{result.error}</Alert>}
      {result?.data?.length === 0 && (
        <p>Este negocio aun no registra movimientos.</p>
      )}
      <ol>
        {result?.data?.map((item) => (
          <li key={item.id}>
            <strong>
              {item.fromStage ? item.fromStage.name + " → " : "Creado en "}
              {item.toStage.name}
            </strong>
            <span>
              {item.changedBy?.name ?? "Usuario no disponible"} ·{" "}
              {formatDateTime(item.changedAt)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
