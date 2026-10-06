import {
  Building2,
  CircleDollarSign,
  Clock3,
  Globe2,
  Mail,
  MapPin,
  Phone,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ESTADO_NEGOCIO } from "@/content/catalogos";
import { authenticatedApi } from "@/lib/authenticated-api";
import { formatDateTime, formatMoney } from "@/lib/format";
import { formatPhone, splitPhone } from "@/lib/phone";
import { CompanyForm } from "../company-form";
import type { CompanyDetail } from "../types";

export default async function CompanyDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const response = await authenticatedApi(
    `/companies/${encodeURIComponent(id)}`,
  );
  if (response.status === 404) notFound();
  if (!response.ok) return <p role="alert">No pudimos cargar la empresa.</p>;

  const company = (await response.json()) as CompanyDetail;
  const phone = splitPhone(company.phone);
  const values = {
    name: company.name,
    legalName: company.legalName ?? "",
    taxId: company.taxId ?? "",
    website: company.website ?? "",
    email: company.email ?? "",
    phone: phone.national,
    phoneCountry: phone.country,
    province: company.province ?? "",
    city: company.city ?? "",
    address: company.address ?? "",
    tags: company.tags.join(", "),
  };

  return (
    <div className="contact-detail-page">
      <Link className="back-link" href="/empresas">
        ← Volver a empresas
      </Link>
      <section className="contact-profile card">
        <span className="avatar contact-profile-avatar">
          <Building2 aria-hidden />
        </span>
        <div>
          <span>Ficha de empresa</span>
          <h2>{company.name}</h2>
          <p>{company.legalName ?? "Sin razón social"}</p>
        </div>
        <div className="contact-tags">
          {company.tags.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
        </div>
      </section>

      <div className="contact-detail-grid">
        <div className="contact-detail-main">
          <Card className="contact-data-card">
            <h3>Datos de la empresa</h3>
            <dl>
              <Info icon={<Building2 />} label="RUC" value={company.taxId} />
              <Info icon={<Mail />} label="Correo" value={company.email} />
              <Info
                icon={<Phone />}
                label="Teléfono"
                value={company.phone && formatPhone(company.phone)}
              />
              <Info
                icon={<MapPin />}
                label="Ubicación"
                value={[company.address, company.city, company.province]
                  .filter(Boolean)
                  .join(", ")}
              />
              <Info
                icon={<Globe2 />}
                label="Sitio web"
                value={
                  company.website ? (
                    <a href={company.website}>{company.website}</a>
                  ) : null
                }
              />
              <Info
                icon={<UserRound />}
                label="Responsable"
                value={company.owner?.name}
              />
            </dl>
          </Card>

          <Card className="contact-related">
            <h3>
              <Users />
              Contactos <Badge tone="blue">{company.contacts.length}</Badge>
            </h3>
            {company.contacts.length ? (
              company.contacts.map((contact) => (
                <article key={contact.id}>
                  <div>
                    <Link href={`/contactos/${contact.id}`}>
                      <strong>
                        {contact.firstName} {contact.lastName}
                      </strong>
                    </Link>
                    <span>{contact.position ?? contact.email ?? "Sin cargo"}</span>
                  </div>
                  <b>{contact.phone ? formatPhone(contact.phone) : "—"}</b>
                </article>
              ))
            ) : (
              <p>No hay contactos vinculados.</p>
            )}
          </Card>

          <Card className="contact-related">
            <h3>
              <CircleDollarSign />
              Negocios <Badge tone="blue">{company.deals.length}</Badge>
            </h3>
            {company.deals.length ? (
              company.deals.map((deal) => (
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

          <Card className="contact-related company-history">
            <h3>
              <Clock3 />
              Historial
            </h3>
            {company.history.length ? (
              company.history.map((entry) => (
                <article key={entry.id}>
                  <div>
                    <strong>{historyLabel(entry)}</strong>
                    <span>{entry.user?.name ?? "Sistema"}</span>
                  </div>
                  <b>{formatDateTime(entry.createdAt)}</b>
                </article>
              ))
            ) : (
              <article>
                <div>
                  <strong>Empresa creada</strong>
                  <span>Registro anterior al historial detallado</span>
                </div>
                <b>{formatDateTime(company.createdAt)}</b>
              </article>
            )}
          </Card>
        </div>

        <CompanyForm id={company.id} initialValues={values} embedded={false} />
      </div>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
}>) {
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

const FIELD_LABELS: Record<string, string> = {
  name: "nombre comercial",
  legalName: "razón social",
  taxId: "RUC",
  website: "sitio web",
  phone: "teléfono",
  email: "correo",
  province: "provincia",
  city: "cantón",
  address: "dirección",
  tags: "etiquetas",
  ownerId: "responsable",
};

function historyLabel(entry: CompanyDetail["history"][number]) {
  if (entry.action === "CREATE") return "Empresa creada";
  const fields = entry.changes?.fields
    ?.map((field) => FIELD_LABELS[field] ?? field)
    .join(", ");
  return fields ? `Actualizó ${fields}` : "Empresa actualizada";
}

