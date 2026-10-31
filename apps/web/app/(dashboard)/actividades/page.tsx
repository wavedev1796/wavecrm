import { CircleAlert, CircleX, ListTodo } from "lucide-react";
import {
  Agenda,
  NewActivityForm,
  ActivitiesToastHost,
  type AgendaActivity,
} from "@/features/actividades/agenda";
import { apiError, authenticatedApi } from "@/lib/authenticated-api";
import { unstable_rethrow } from "next/navigation";

type Params = {
  type?: string;
  assigneeId?: string;
  period?: string;
  view?: string;
};
type Owner = { id: string; name: string };

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.type) query.set("type", params.type);
  if (params.assigneeId) query.set("assigneeId", params.assigneeId);
  if (params.period === "upcoming" || params.period === "overdue")
    query.set("period", params.period);
  const [activitiesResult, ownersResult] = await Promise.allSettled([
    authenticatedApi(`/activities?${query.toString()}`),
    authenticatedApi("/pipeline/owners"),
  ]);
  if (activitiesResult.status === "rejected") unstable_rethrow(activitiesResult.reason);
  if (ownersResult.status === "rejected") unstable_rethrow(ownersResult.reason);
  const result =
    activitiesResult.status === "fulfilled" && activitiesResult.value.ok
      ? ((await activitiesResult.value.json()) as {
          data: AgendaActivity[];
          meta: { pending: number; overdue: number };
        })
      : null;
  const loadError = activitiesResult.status === "fulfilled" && !activitiesResult.value.ok
    ? await apiError(activitiesResult.value)
    : null;
  const owners =
    ownersResult.status === "fulfilled" && ownersResult.value.ok
      ? ((await ownersResult.value.json()) as Owner[])
      : [];
  return (
    <div className="activities-page">
      <ActivitiesToastHost message={!result ? loadError ?? "No pudimos conectar con la agenda. Intenta de nuevo." : undefined} />
      <section className="activities-intro">
        <div>
          <span>OPERACIÓN COMERCIAL</span>
          <h2>Agenda del equipo</h2>
          <p>
            Organiza el seguimiento, identifica atrasos y distribuye el trabajo.
          </p>
        </div>
        <NewActivityForm owners={owners} />
      </section>
      {!result ? (
        <div className="activities-load-error card">
          <CircleX aria-hidden />
          <div><strong>No se pudo cargar la agenda</strong><p>{loadError ?? "Revisa la conexión e inténtalo de nuevo."}</p></div>
        </div>
      ) : (
        <>
          <div className="activities-summary">
            <article className="card activities-summary-pending">
              <div className="activity-summary-icon"><ListTodo aria-hidden /></div>
              <span>Actividades pendientes</span>
              <strong>{result.meta.pending}</strong>
            </article>
            <article className="card activities-summary-overdue">
              <div className="activity-summary-icon"><CircleAlert aria-hidden /></div>
              <span>Requieren atención</span>
              <strong>{result.meta.overdue}</strong>
            </article>
          </div>
          <Agenda
            activities={result.data}
            owners={owners}
            initialType={params.type ?? ""}
            initialAssigneeId={params.assigneeId ?? ""}
            focus={params.period ?? ""}
            initialView={params.view === "calendar" ? "calendar" : "list"}
          />
        </>
      )}
    </div>
  );
}
