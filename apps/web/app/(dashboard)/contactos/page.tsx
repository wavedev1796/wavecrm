import { UsersRound } from "lucide-react";
import Link from "next/link";
import { ListFilters } from "@/components/list-filters";
import { ListHeader } from "@/components/list-header";
import { Pagination } from "@/components/pagination";
import { TagList } from "@/components/tag-list";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { COMUN } from "@/content/comun";
import { CONTACTOS } from "@/content/contactos";
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
  const texto = CONTACTOS.listado;

  return (
    <div className="contacts-page">
      {!result && (
        <Alert tone="error">{texto.errorCarga}</Alert>
      )}
      <Card className="data-card">
        <ListHeader
          icon={<UsersRound aria-hidden />}
          title={texto.titulo}
          summary={
            result ? texto.total(result.meta.total) : texto.resumenSinDatos
          }
          importHref="/contactos/importar"
        >
          <NewContactDialog />
        </ListHeader>
        <ListFilters
          basePath="/contactos"
          params={params}
          searchLabel={texto.buscar.etiqueta}
          searchPlaceholder={texto.buscar.placeholder}
        />
        <Table>
          <thead>
            <tr>
              {texto.columnas.map((columna) => (
                <th key={columna}>{columna}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <ContactRow key={contact.id} contact={contact} />
            ))}
            {result && !contacts.length && (
              <tr>
                <td colSpan={texto.columnas.length} className="empty-table">
                  {texto.sinResultados}
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
            label={texto.paginacion}
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
      <td>{contact.company?.name ?? COMUN.sinDato}</td>
      <td>{contact.province ?? COMUN.sinDato}</td>
      <td>
        <TagList tags={contact.tags} />
      </td>
      <td>{contact.owner?.name ?? CONTACTOS.listado.sinAsignar}</td>
    </tr>
  );
}
