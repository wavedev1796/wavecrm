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
import { Info } from "@/components/data/detail-info";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CONTACTOS } from "@/content/contactos";
import { TIMELINE } from "@/content/timeline";
import { authenticatedApi } from "@/lib/authenticated-api";
import { initials } from "@/lib/format";
import { DOCUMENT_TYPES } from "@/lib/ecuador";
import { formatPhone, splitPhone } from "@/lib/phone";
import { ContactForm } from "../../../../features/contactos/contact-form";
import { companyLabel } from "../../../../features/contactos/contact-form-state";
import type { ContactDetail } from "../../../../features/contactos/types";
import { ClientProducts } from "../../../../features/pipeline/client-products";
import { DealJourney } from "../../../../features/pipeline/deal-journey";
import { loadTimeline } from "../../../../features/timeline/actions";
import { NoteForm } from "../../../../features/timeline/note-form";
import { TimelineList } from "../../../../features/timeline/timeline-list";
import type { Member } from "../../../../features/timeline/types";

export default async function ContactDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  // El historial se pide aparte (paginado y con su propio alcance): un 404 suyo no oculta la ficha.
  const [response, timeline, owners] = await Promise.all([
    authenticatedApi(`/contacts/${encodeURIComponent(id)}`),
    loadTimeline("contacts", id),
    authenticatedApi("/pipeline/owners"),
  ]);
  if (response.status === 404) notFound();
  const texto = CONTACTOS.ficha;
  if (!response.ok) return <p role="alert">{texto.errorCarga}</p>;
  const contact = (await response.json()) as ContactDetail;
  // Sin la lista de miembros, la nota se escribe igual, solo sin menciones.
  const members = owners.ok ? ((await owners.json()) as Member[]) : [];
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
              contact.deals.map((deal) => <DealJourney key={deal.id} deal={deal} />)
            ) : (
              <p>{texto.sinNegocios}</p>
            )}
          </Card>
          <ClientProducts deals={contact.deals} />
          <Card className="contact-related deal-timeline">
            <h3>
              <CalendarDays />
              {TIMELINE.historial}
            </h3>
            <NoteForm kind="contacts" id={contact.id} members={members} />
            <TimelineList kind="contacts" id={contact.id} initial={timeline} members={members} />
          </Card>
        </div>
        <ContactForm id={contact.id} initialValues={values} />
      </div>
    </div>
  );
}
