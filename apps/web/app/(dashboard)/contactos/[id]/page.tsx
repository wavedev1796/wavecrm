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
import { COMUN } from "@/content/comun";
import { CONTACTOS } from "@/content/contactos";
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
  const texto = CONTACTOS.ficha;
  if (!response.ok) return <p role="alert">{texto.errorCarga}</p>;
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
        {texto.volver}
      </Link>
      <section className="contact-profile card">
        <span className="avatar contact-profile-avatar">
          {initials(`${contact.firstName} ${contact.lastName}`)}
        </span>
        <div>
          <span>{texto.etiqueta}</span>
          <h2>
            {contact.firstName} {contact.lastName}
          </h2>
          <p>
            {contact.position ?? texto.sinCargo}
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
            <h3>{texto.datos}</h3>
            <dl>
              <Info icon={<Mail />} label={texto.campos.correo} value={contact.email} />
              <Info
                icon={<Phone />}
                label={texto.campos.telefono}
                value={contact.phone && formatPhone(contact.phone)}
              />
              <Info
                icon={<UserRound />}
                label={texto.campos.documento}
                value={`${documentLabel ?? ""} ${contact.documentId}`.trim()}
              />
              <Info
                icon={<MapPin />}
                label={texto.campos.ubicacion}
                value={[contact.city, contact.province]
                  .filter(Boolean)
                  .join(", ")}
              />
              <Info
                icon={<UserRound />}
                label={texto.campos.responsable}
                value={contact.owner?.name}
              />
            </dl>
          </Card>
          <Card className="contact-related">
            <h3>
              <CircleDollarSign />
              {texto.negocios}{" "}
              <Badge tone="blue">{contact.deals.length}</Badge>
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
              <p>{texto.sinNegocios}</p>
            )}
          </Card>
          <Card className="contact-related">
            <h3>
              <CalendarDays />
              {texto.actividades}{" "}
              <Badge tone="blue">{contact.activities.length}</Badge>
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
                  <b>{activity.dueAt ? formatDate(activity.dueAt) : texto.sinFecha}</b>
                </article>
              ))
            ) : (
              <p>{texto.sinActividades}</p>
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
      <dd>{value || COMUN.sinDato}</dd>
    </div>
  );
}
