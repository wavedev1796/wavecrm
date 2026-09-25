import { Filter, Search, Upload, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { authenticatedApi } from "@/lib/authenticated-api";
import { PROVINCES } from "@/lib/ecuador";
import { SEARCH_MAX } from "@/lib/validation";
import { NewContactDialog } from "./new-contact-dialog";
import type { Contact, ContactList } from "./types";

type PageProps = Readonly<{
  searchParams: Promise<{
    search?: string;
    province?: string;
    tag?: string;
    page?: string;
  }>;
}>;
const PAGE_SIZE = 10;

export default async function ContactsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = positivePage(params.page);
  const query = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (params.search) query.set("search", params.search);
  if (
    params.province &&
    (PROVINCES as readonly string[]).includes(params.province)
  )
    query.set("province", params.province);
  if (params.tag) query.set("tag", params.tag);
  const response = await authenticatedApi(`/contacts?${query}`);
  const result = response.ok ? ((await response.json()) as ContactList) : null;
  const contacts = result?.data ?? [];

  return (
    <div className="contacts-page">
      {!result && (
        <Alert tone="error">
          No pudimos cargar los contactos. Recarga la página.
        </Alert>
      )}
      <Card className="data-card">
        <header className="contact-list-header">
          <div className="contact-list-title">
            <span className="contact-list-mark">
              <UsersRound aria-hidden />
            </span>
            <div>
              <span>Directorio comercial</span>
              <h2>Todos los contactos</h2>
              <p>
                {result
                  ? `${result.meta.total} contacto${result.meta.total === 1 ? "" : "s"} registrado${result.meta.total === 1 ? "" : "s"}`
                  : "Consulta y organiza tu cartera"}
              </p>
            </div>
          </div>
          <div className="contact-list-actions">
            <Link
              className="button button--secondary"
              href="/contactos/importar"
            >
              <Upload aria-hidden />
              Importar CSV
            </Link>
            <NewContactDialog />
          </div>
        </header>
        <form className="contact-filter-panel" method="get">
          <label className="contact-search">
            <Search aria-hidden />
            <span className="sr-only">Buscar contacto</span>
            <Input
              name="search"
              defaultValue={params.search}
              maxLength={SEARCH_MAX}
              placeholder="Buscar por nombre, empresa, cédula o RUC"
            />
          </label>
          <div className="contact-filter-fields">
            <select
              name="province"
              defaultValue={params.province ?? ""}
              aria-label="Filtrar por provincia"
            >
              <option value="">Todas las provincias</option>
              {PROVINCES.map((province) => (
                <option key={province}>{province}</option>
              ))}
            </select>
            <Input
              name="tag"
              defaultValue={params.tag}
              maxLength={30}
              placeholder="Etiqueta"
              aria-label="Filtrar por etiqueta"
            />
            <Button type="submit">
              <Filter aria-hidden />
              Aplicar filtros
            </Button>
            {(params.search || params.province || params.tag) && (
              <Link className="button button--ghost" href="/contactos">
                <X aria-hidden />
                Limpiar
              </Link>
            )}
          </div>
        </form>
        <Table>
          <thead>
            <tr>
              <th>Contacto</th>
              <th>Empresa</th>
              <th>Provincia</th>
              <th>Etiquetas</th>
              <th>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <ContactRow key={contact.id} contact={contact} />
            ))}
            {result && !contacts.length && (
              <tr>
                <td colSpan={5} className="empty-table">
                  No hay contactos que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
        {result && <Pagination result={result} params={params} />}
      </Card>
    </div>
  );
}

function ContactRow({ contact }: Readonly<{ contact: Contact }>) {
  const name = `${contact.firstName} ${contact.lastName}`;
  return (
    <tr>
      <td>
        <Link
          className="contact-cell contact-link"
          href={`/contactos/${contact.id}`}
        >
          <span className="avatar">{initials(name)}</span>
          <span>
            <strong>{name}</strong>
            <small>{contact.email ?? contact.documentId ?? "Sin correo"}</small>
          </span>
        </Link>
      </td>
      <td>{contact.company?.name ?? "—"}</td>
      <td>{contact.province ?? "—"}</td>
      <td>
        <div className="contact-tags">
          {contact.tags.length
            ? contact.tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))
            : "—"}
        </div>
      </td>
      <td>{contact.owner?.name ?? "Sin asignar"}</td>
    </tr>
  );
}

function Pagination({
  result,
  params,
}: Readonly<{
  result: ContactList;
  params: { search?: string; province?: string; tag?: string };
}>) {
  const { meta, data } = result;
  return (
    <nav className="table-footer" aria-label="Paginación de contactos">
      <span>
        {data.length
          ? `Mostrando ${(meta.page - 1) * meta.limit + 1}–${(meta.page - 1) * meta.limit + data.length} de ${meta.total}`
          : `Mostrando 0 de ${meta.total}`}{" "}
        · Página {meta.page} de {Math.max(meta.totalPages, 1)}
      </span>
      <div>
        {meta.page > 1 ? (
          <Link
            className="button button--secondary"
            href={pageHref(params, meta.page - 1)}
          >
            Anterior
          </Link>
        ) : (
          <span className="button button--secondary" aria-disabled="true">
            Anterior
          </span>
        )}
        {meta.page < meta.totalPages ? (
          <Link
            className="button button--secondary"
            href={pageHref(params, meta.page + 1)}
          >
            Siguiente
          </Link>
        ) : (
          <span className="button button--secondary" aria-disabled="true">
            Siguiente
          </span>
        )}
      </div>
    </nav>
  );
}

function pageHref(
  params: { search?: string; province?: string; tag?: string },
  page: number,
) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.province) query.set("province", params.province);
  if (params.tag) query.set("tag", params.tag);
  query.set("page", String(page));
  return `/contactos?${query}`;
}
function positivePage(value?: string) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
