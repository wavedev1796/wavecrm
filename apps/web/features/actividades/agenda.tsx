"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Ban, CalendarDays, Check, CircleAlert, CircleCheck, ClipboardList, List, Mail, Pencil, Phone, Plus, Trash2, Video, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ESTADO_ACTIVIDAD, TIPO_ACTIVIDAD } from "@/content/catalogos";
import { ACTIVIDADES } from "@/content/actividades";
import { saveActivity } from "./actions";
import { ActivityDialog } from "./activity-dialog";

export type AgendaActivity = {
  id: string;
  updatedAt: string;
  type: keyof typeof TIPO_ACTIVIDAD;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  subject: string;
  description: string | null;
  dueAt: string | null;
  reminderAt: string | null;
  assigneeId: string | null;
  assignee: { id: string; name: string; email: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  company: { id: string; name: string } | null;
  deal: { id: string; title: string } | null;
};
type Owner = { id: string; name: string };
type ToastDetail = { ok: boolean; message: string };
const TOAST_EVENT = "wave:activity-toast";

function notify(result: ToastDetail) {
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: result }));
}

export function ActivitiesToastHost({ message }: { message?: string | null }) {
  const [toast, setToast] = useState<ToastDetail | null>(null);
  useEffect(() => {
    const onToast = (event: Event) => setToast((event as CustomEvent<ToastDetail>).detail);
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);
  useEffect(() => {
    if (message) setToast({ ok: false, message });
  }, [message]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  if (!toast) return null;
  const Icon = toast.ok ? CircleCheck : CircleAlert;
  return (
    <div className={`activity-toast ${toast.ok ? "activity-toast--success" : "activity-toast--error"}`} role={toast.ok ? "status" : "alert"}>
      <Icon aria-hidden /><span>{toast.message}</span>
      <button type="button" aria-label="Cerrar notificación" onClick={() => setToast(null)}><X aria-hidden /></button>
    </div>
  );
}

export function Agenda({
  activities,
  owners,
  initialView = "list",
  initialType = "",
  initialAssigneeId = "",
  focus = "",
  dealFilter,
}: {
  activities: AgendaActivity[];
  owners: Owner[];
  initialView?: "list" | "calendar";
  initialType?: string;
  initialAssigneeId?: string;
  focus?: string;
  /** Llegó desde la ficha de un negocio (`?dealId=`): solo sus actividades, con un filtro que se puede quitar. */
  dealFilter?: { id: string; title: string };
}) {
  const [view, setView] = useState(initialView);
  const [period, setPeriod] = useState(focus || "all");
  const [editing, setEditing] = useState<AgendaActivity | null>(null);
  const router = useRouter();
  const visible = useMemo(
    () =>
      activities.filter((activity) => {
        const due = activity.dueAt ? new Date(activity.dueAt) : null;
        const today = new Date(
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Guayaquil",
          }).format(new Date()) + "T05:00:00Z",
        );
        if (period === "upcoming")
          return activity.status === "PENDING" && due !== null && due >= today;
        if (period === "overdue")
          return activity.status === "PENDING" && due !== null && due < today;
        return true;
      }),
    [activities, period],
  );
  return (
    <section className="activities-agenda">
      <div className="activities-toolbar card">
        <div className="activities-filters">
          <label>
            <span>Tipo</span>
            <Select
              aria-label="Filtrar por tipo"
              onChange={(event) => setFilter("type", event.target.value)}
              defaultValue={initialType}
            >
              <option value="">Todos los tipos</option>
              {Object.entries(TIPO_ACTIVIDAD).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span>Responsable</span>
            <Select
              aria-label="Filtrar por responsable"
              onChange={(event) => setFilter("assigneeId", event.target.value)}
              defaultValue={initialAssigneeId}
            >
              <option value="">Todo el equipo</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span>Fecha</span>
            <Select
              aria-label="Filtrar por fecha"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value="all">Todas</option>
              <option value="upcoming">Próximas</option>
              <option value="overdue">Atrasadas</option>
            </Select>
          </label>
          {dealFilter && (
            <span className="activities-deal-filter">
              {ACTIVIDADES.filtroNegocio(dealFilter.title)}
              <button type="button" aria-label={ACTIVIDADES.quitarFiltroNegocio} onClick={() => setFilter("dealId", "")}>
                <X aria-hidden />
              </button>
            </span>
          )}
        </div>
        <div
          className="activities-view-toggle"
          role="group"
          aria-label="Vista de agenda"
        >
          <Button
            type="button"
            variant={view === "list" ? "primary" : "secondary"}
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List aria-hidden />
            Lista
          </Button>
          <Button
            type="button"
            variant={view === "calendar" ? "primary" : "secondary"}
            aria-pressed={view === "calendar"}
            onClick={() => setView("calendar")}
          >
            <CalendarDays aria-hidden />
            Calendario
          </Button>
        </div>
      </div>
      {view === "calendar" ? (
        <CalendarView activities={visible} />
      ) : (
        <div className="activities-list">
          {visible.map((activity) => (
            <article
              className={`activity-card card${isOverdue(activity) ? " activity-card--overdue" : ""}`}
              key={activity.id}
            >
              <div className="activity-card-date">
                <strong>
                  {activity.dueAt ? datePart(activity.dueAt) : "Sin fecha"}
                </strong>
                <span>{activity.dueAt ? timePart(activity.dueAt) : ""}</span>
              </div>
              <div className="activity-card-main">
                <div className="activity-card-heading">
                  <Badge
                    tone={
                      activity.status === "COMPLETED"
                        ? "success"
                        : isOverdue(activity)
                          ? "danger"
                          : "blue"
                    }
                  >
                    {activity.status === "PENDING" && isOverdue(activity)
                      ? "Atrasada"
                      : ESTADO_ACTIVIDAD[activity.status]}
                  </Badge>
                  <span className="activity-kind">
                    {typeIcon(activity.type)}
                    {TIPO_ACTIVIDAD[activity.type]}
                  </span>
                </div>
                <h3>{activity.subject}</h3>
                {activity.description && <p>{activity.description}</p>}
                <small>
                  {activity.assignee?.name ?? "Sin responsable"}
                  {activity.contact
                    ? ` · ${activity.contact.firstName} ${activity.contact.lastName}`
                    : ""}
                  {activity.company ? ` · ${activity.company.name}` : ""}
                  {activity.deal && (
                    <>
                      {" · "}
                      <Link href={`/pipeline/${encodeURIComponent(activity.deal.id)}`} aria-label={ACTIVIDADES.abrirNegocio(activity.deal.title)}>
                        {activity.deal.title}
                      </Link>
                    </>
                  )}
                </small>
              </div>
              {activity.status === "PENDING" && (
                <div className="activity-card-actions">
                  <ActivityMutationForm
                    activity={activity}
                    action="complete"
                    label="Hecha"
                    ariaLabel={`Marcar ${activity.subject} como hecha`}
                    variant="secondary"
                  ><Check aria-hidden />Hecha</ActivityMutationForm>
                  <ActivityMutationForm
                    activity={activity}
                    action="cancel"
                    label={ACTIVIDADES.cancelar}
                    ariaLabel={`${ACTIVIDADES.cancelar} ${activity.subject}`}
                    confirm={ACTIVIDADES.confirmarCancelar}
                  ><Ban aria-hidden /></ActivityMutationForm>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setEditing(activity)}
                    aria-label={`Editar ${activity.subject}`}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <ActivityMutationForm
                    activity={activity}
                    action="delete"
                    label="Eliminar"
                    ariaLabel={`Eliminar ${activity.subject}`}
                    confirm="¿Eliminar esta actividad?"
                  ><Trash2 aria-hidden /></ActivityMutationForm>
                </div>
              )}
            </article>
          ))}
          {!visible.length && (
            <div className="activities-empty card">
              <CalendarDays aria-hidden />
              <h2>No hay actividades en este rango</h2>
              <p>Prueba con otro filtro o registra una nueva actividad.</p>
            </div>
          )}
        </div>
      )}
      {editing && (
        <EditActivityDialog
          activity={editing}
          owners={owners}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
          onConflict={() => router.refresh()}
        />
      )}
    </section>
  );

  function setFilter(key: "type" | "assigneeId" | "dealId", value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/actividades?${params.toString()}`);
  }
}

function ActivityMutationForm({
  activity,
  action,
  label,
  ariaLabel,
  variant = "ghost",
  confirm,
  children,
}: {
  activity: AgendaActivity;
  action: "complete" | "cancel" | "delete";
  label: string;
  ariaLabel: string;
  variant?: "ghost" | "secondary";
  confirm?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (confirm && !window.confirm(confirm)) event.preventDefault();
        else {
          setPending(true);
          try {
            const response = await fetch(`/api/activities/${encodeURIComponent(activity.id)}/${action}`, {
              method: action === "delete" ? "DELETE" : "PATCH",
            });
            const payload = await response.json().catch(() => null) as { ok?: boolean; message?: string; error?: { message?: string | string[] } } | null;
            const apiMessage = payload?.message ?? payload?.error?.message;
            const result = {
              ok: response.ok && payload?.ok === true,
              message: response.ok
                ? action === "complete" ? ACTIVIDADES.completada : action === "cancel" ? ACTIVIDADES.cancelada : ACTIVIDADES.eliminada
                : Array.isArray(apiMessage) ? apiMessage.join(" ") : apiMessage ?? ACTIVIDADES.errorOperacion,
            };
            notify(result);
            if (result.ok) router.refresh();
          } catch {
            notify({ ok: false, message: ACTIVIDADES.errorOperacion });
          } finally {
            setPending(false);
          }
        }
      }}
    >
      <Button
        type="submit"
        variant={variant}
        loading={pending}
        aria-label={ariaLabel}
        title={label}
      >
        {children}
      </Button>
    </form>
  );
}

function EditActivityDialog({
  activity,
  owners,
  onClose,
  onSaved,
  onConflict,
}: {
  activity: AgendaActivity;
  owners: Owner[];
  onClose: () => void;
  onSaved: () => void;
  onConflict: () => void;
}) {
  return (
    <ActivityDialog
      mode="edit"
      owners={owners}
      activity={activity}
      onClose={onClose}
      onSubmit={async (data) => {
        data.set("id", activity.id);
        const result = await saveActivity({ ok: false, message: "" }, data);
        notify(result);
        if (result.ok) onSaved();
        else if (result.conflict) {
          onClose();
          onConflict();
        }
        return result;
      }}
    />
  );
}

export function NewActivityForm({ owners }: { owners: Owner[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}><Plus aria-hidden /> {ACTIVIDADES.formulario.nueva}</Button>
      {open && (
        <ActivityDialog
          owners={owners}
          onClose={() => setOpen(false)}
          onSubmit={async (data) => {
            const result = await saveActivity({ ok: false, message: "" }, data);
            notify(result);
            if (result.ok) {
              setOpen(false);
              router.refresh();
            }
            return result;
          }}
        />
      )}
    </>
  );
}

function CalendarView({ activities }: { activities: AgendaActivity[] }) {
  const [month, setMonth] = useState(() => new Date());
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return (
    <div className="calendar-panel card">
      <header>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
          aria-label="Mes anterior"
        >
          ‹
        </Button>
        <h2>
          {new Intl.DateTimeFormat("es-EC", {
            month: "long",
            year: "numeric",
          }).format(month)}
        </h2>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
          aria-label="Mes siguiente"
        >
          ›
        </Button>
      </header>
      <div className="calendar-grid" role="grid">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
          <strong role="columnheader" key={day}>
            {day}
          </strong>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span className="calendar-blank" key={`blank-${i}`} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const entries = activities.filter(
            (activity) =>
              activity.dueAt &&
              activityDateParts(activity.dueAt).year === month.getFullYear() &&
              activityDateParts(activity.dueAt).month === month.getMonth() &&
              activityDateParts(activity.dueAt).day === day,
          );
          return (
            <div className="calendar-day" role="gridcell" key={day}>
              <span>{day}</span>
              {entries.slice(0, 3).map((entry) => (
                <small
                  key={entry.id}
                  title={`${entry.subject} · ${entry.assignee?.name ?? "Sin responsable"}`}
                >
                  {entry.subject}
                </small>
              ))}
              {entries.length > 3 && <small>+{entries.length - 3} más</small>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function datePart(value: string) {
  return new Intl.DateTimeFormat("es-EC", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "America/Guayaquil",
  }).format(new Date(value));
}
function activityDateParts(value: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const record = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return {
    year: Number(record.year),
    month: Number(record.month) - 1,
    day: Number(record.day),
  };
}
function timePart(value: string) {
  return new Intl.DateTimeFormat("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Guayaquil",
  }).format(new Date(value));
}
function typeIcon(type: keyof typeof TIPO_ACTIVIDAD) {
  const Icon = type === "CALL" ? Phone : type === "EMAIL" ? Mail : type === "MEETING" ? Video : ClipboardList;
  return <Icon aria-hidden className="activity-kind-icon" />;
}
function isOverdue(activity: AgendaActivity) {
  return (
    activity.status === "PENDING" &&
    !!activity.dueAt &&
    new Date(activity.dueAt) <
      new Date(
        new Date().toLocaleDateString("en-CA", {
          timeZone: "America/Guayaquil",
        }) + "T05:00:00Z",
      )
  );
}
