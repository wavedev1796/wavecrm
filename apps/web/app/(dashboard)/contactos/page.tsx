import { UsersRound } from "lucide-react";
import Link from "next/link";
import { ListFilters } from "@/components/list-filters";
import { ListHeader } from "@/components/list-header";
import { Pagination } from "@/components/pagination";
import { TagList } from "@/components/tag-list";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { authenticatedApi } from "@/lib/authenticated-api";
import { initials } from "@/lib/format";
import { listQuery } from "@/lib/list-params";
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
  const response = await authenticatedApi(
    `/contacts?${listQuery(params, PAGE_SIZE)}`,
  );
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
        <ListHeader
          icon={<UsersRound aria-hidden />}
          title="Todos los contactos"
          summary={
            result
              ? contactCount(result.meta.total)
              : "Consulta y organiza tu cartera"
          }
          importHref="/contactos/importar"
        >
          <NewContactDialog />
        </ListHeader>
        <ListFilters
          basePath="/contactos"
          params={params}
          searchLabel="Buscar contacto"
          searchPlaceholder="Buscar por nombre, empresa, documento o RUC"
        />
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
        {result && (
          <Pagination
            basePath="/contactos"
            params={params}
            meta={result.meta}
            shown={contacts.length}
            label="Paginación de contactos"
          />
        )}
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
            <small>{contact.email ?? contact.documentId}</small>
          </span>
        </Link>
      </td>
      <td>{contact.company?.name ?? "—"}</td>
      <td>{contact.province ?? "—"}</td>
      <td>
        <TagList tags={contact.tags} />
      </td>
      <td>{contact.owner?.name ?? "Sin asignar"}</td>
    </tr>
  );
}

function contactCount(total: number) {
  return total === 1
    ? "1 contacto registrado"
    : `${total} contactos registrados`;
}
