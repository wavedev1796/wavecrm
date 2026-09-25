import {
  CalendarDays,
  CircleDollarSign,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { authenticatedApi } from "@/lib/authenticated-api";
import { ContactForm } from "../contact-form";
import type { ContactDetail } from "../types";

export default async function ContactDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const response = await authenticatedApi(
    `/contacts/${encodeURIComponent(id)}`,
  );
  if (response.status === 404) notFound();
  if (!response.ok) return <p role="alert">No pudimos cargar el contacto.</p>;
  const contact = (await response.json()) as ContactDetail;
  const values = {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    documentId: contact.documentId ?? "",
    province: contact.province ?? "",
    city: contact.city ?? "",
    position: contact.position ?? "",
    tags: contact.tags.join(", "),
    companyTaxId: contact.company?.taxId ?? "",
  };
  return (
    <div className="contact-detail-page">
      <Link className="back-link" href="/contactos">
        ← Volver a contactos
      </Link>
      <section className="contact-profile card">
        <span className="avatar contact-profile-avatar">
          {initials(`${contact.firstName} ${contact.lastName}`)}
        </span>
        <div>
          <span>Ficha de contacto</span>
          <h2>
            {contact.firstName} {contact.lastName}
          </h2>
          <p>
            {contact.position ?? "Sin cargo"}
            {contact.company ? ` · ${contact.company.name}` : ""}
          </p>
        </div>
        <div className="contact-tags">
          {contact.tags.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
        </div>
      </section>
      <div className="contact-detail-grid">
        <div className="contact-detail-main">
          <Card className="contact-data-card">
            <h3>Datos del contacto</h3>
            <dl>
              <Info icon={<Mail />} label="Correo" value={contact.email} />
              <Info icon={<Phone />} label="Teléfono" value={contact.phone} />
              <Info
                icon={<UserRound />}
                label="Cédula"
                value={contact.documentId}
              />
              <Info
                icon={<MapPin />}
                label="Ubicación"
                value={[contact.city, contact.province]
                  .filter(Boolean)
                  .join(", ")}
              />
              <Info
                icon={<UserRound />}
                label="Responsable"
                value={contact.owner?.name}
              />
            </dl>
          </Card>
          <Card className="contact-related">
            <h3>
              <CircleDollarSign />
              Negocios <Badge tone="blue">{contact.deals.length}</Badge>
            </h3>
            {contact.deals.length ? (
              contact.deals.map((deal) => (
                <article key={deal.id}>
                  <div>
                    <strong>{deal.title}</strong>
                    <span>
                      {deal.stage.name} ·{" "}
                      {deal.status === "OPEN"
                        ? "Abierto"
                        : deal.status === "WON"
                          ? "Ganado"
                          : "Perdido"}
                    </span>
                  </div>
                  <b>{money(deal.value, deal.currency)}</b>
                </article>
              ))
            ) : (
              <p>No hay negocios vinculados.</p>
            )}
          </Card>
          <Card className="contact-related">
            <h3>
              <CalendarDays />
              Actividades <Badge tone="blue">{contact.activities.length}</Badge>
            </h3>
            {contact.activities.length ? (
              contact.activities.map((activity) => (
                <article key={activity.id}>
                  <div>
                    <strong>{activity.subject}</strong>
                    <span>
                      {activityType(activity.type)}
                      {activity.assignee ? ` · ${activity.assignee.name}` : ""}
                    </span>
                  </div>
                  <b>{activity.dueAt ? date(activity.dueAt) : "Sin fecha"}</b>
                </article>
              ))
            ) : (
              <p>No hay actividades vinculadas.</p>
            )}
          </Card>
        </div>
        <ContactForm id={contact.id} initialValues={values} />
      </div>
    </div>
  );
}
function Info({
  icon,
  label,
  value,
}: Readonly<{ icon: React.ReactNode; label: string; value?: string | null }>) {
  return (
    <div>
      <dt>
        {icon}
        <span>{label}</span>
      </dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
const money = (value: string, currency: string) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency }).format(
    Number(value),
  );
const date = (value: string) =>
  new Intl.DateTimeFormat("es-EC", { dateStyle: "medium" }).format(
    new Date(value),
  );
const activityType = (type: ContactDetail["activities"][number]["type"]) =>
  ({ CALL: "Llamada", EMAIL: "Correo", MEETING: "Reunión", TASK: "Tarea" })[
    type
  ];
