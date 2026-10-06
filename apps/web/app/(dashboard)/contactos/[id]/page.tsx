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
import { ESTADO_NEGOCIO, TIPO_ACTIVIDAD } from "@/content/catalogos";
import { authenticatedApi } from "@/lib/authenticated-api";
import { formatDate, formatMoney, initials } from "@/lib/format";
import { DOCUMENT_TYPES } from "@/lib/ecuador";
import { formatPhone, splitPhone } from "@/lib/phone";
import { ContactForm } from "../contact-form";
import { companyLabel } from "../contact-form-state";
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
  const phone = splitPhone(contact.phone);
  const values = {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email ?? "",
    phone: phone.national,
    phoneCountry: phone.country,
    documentType: contact.documentType,
    documentId: contact.documentId,
    company: contact.company ? companyLabel(contact.company) : "",
    companyId: contact.company?.id ?? "",
    province: contact.province ?? "",
    city: contact.city ?? "",
    position: contact.position ?? "",
    tags: contact.tags.join(", "),
  };
  const documentLabel = DOCUMENT_TYPES.find(
    ({ value }) => value === contact.documentType,
  )?.label;
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
              <Info
                icon={<Phone />}
                label="Teléfono"
                value={contact.phone && formatPhone(contact.phone)}
              />
              <Info
                icon={<UserRound />}
                label="Documento"
                value={`${documentLabel ?? ""} ${contact.documentId}`.trim()}
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
                      {deal.stage.name} · {ESTADO_NEGOCIO[deal.status]}
                    </span>
                  </div>
                  <b>{formatMoney(deal.value, deal.currency)}</b>
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
                      {TIPO_ACTIVIDAD[activity.type]}
                      {activity.assignee ? ` · ${activity.assignee.name}` : ""}
                    </span>
                  </div>
                  <b>{activity.dueAt ? formatDate(activity.dueAt) : "Sin fecha"}</b>
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
