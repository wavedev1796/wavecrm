import { NEGOCIO } from "@/content/pipeline";
import type { Stage } from "./types";

type Step = Pick<Stage, "id" | "name" | "color" | "probability">;

/**
 * Avance del negocio en su pipeline: un tramo por etapa, pintado con el color de la etapa hasta la actual.
 * Es solo lectura: la etapa se cambia desde el tablero o la ficha, donde se aplican las reglas de transición.
 */
export function StageProgress({ stages, currentId, describedBy }: Readonly<{
  stages: readonly Step[];
  currentId: string;
  describedBy?: string;
}>) {
  const index = stages.findIndex((stage) => stage.id === currentId);
  const current = stages[index];
  if (!current) return null;
  const texto = NEGOCIO.avance;
  return (
    <div className="stage-progress">
      <div className="stage-progress-head">
        <span>{current.name}</span>
        <b>{texto.porcentaje(current.probability)}</b>
      </div>
      <div
        role="progressbar"
        aria-label={texto.etiqueta}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={current.probability}
        aria-valuetext={texto.valor(current.name, current.probability)}
        aria-describedby={describedBy}
        className="stage-progress-track"
      >
        {stages.map((stage, position) => (
          <span
            key={stage.id}
            title={texto.valor(stage.name, stage.probability)}
            className="stage-progress-step"
            style={position <= index ? { background: stage.color ?? "var(--wave-blue)" } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
