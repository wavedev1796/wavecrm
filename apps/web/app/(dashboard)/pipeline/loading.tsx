import { Skeleton } from "@/components/ui/skeleton";
import "./pipeline.css";
export default function PipelineLoading() {
  return (
    <output className="pipeline-page" aria-label="Cargando pipeline">
      <div className="pipeline-toolbar" aria-hidden>
        <Skeleton className="skeleton-control" />
        <Skeleton className="skeleton-button" />
      </div>
      <div className="kpi-grid" aria-hidden>
        {[0, 1, 2].map((n) => (
          <div className="card kpi-card" key={n}>
            <Skeleton className="skeleton-heading" />
            <Skeleton className="skeleton-summary" />
          </div>
        ))}
      </div>
      <div className="pipeline-board pipeline-board--live" aria-hidden>
        {[0, 1, 2, 3].map((n) => (
          <div className="pipeline-column" key={n}>
            <Skeleton className="skeleton-heading" />
            <div className="card deal-card">
              <Skeleton className="skeleton-heading" />
              <Skeleton className="skeleton-summary" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando negocios y etapas...</span>
    </output>
  );
}
