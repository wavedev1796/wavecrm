import Link from "next/link";
import { cache } from "react";
import { Pagination } from "@/components/data/pagination";
import { TagList } from "@/components/data/tag-list";
import { Alert } from "@/components/ui/alert";
import { Table } from "@/components/ui/table";
import { COMUN } from "@/content/comun";
import { CONTACTOS } from "@/content/contactos";
import { authenticatedApi } from "@/lib/authenticated-api";
import { initials } from "@/lib/format";
import type { ListParams } from "@/lib/list-params";
import type { Contact, ContactList } from "./types";

/** Una sola llamada al API por render, aunque la pidan el resumen y la tabla. */
const getContacts = cache(async (query: string): Promise<ContactList | null> => {
  const response = await authenticatedApi(`/contacts?${query}`);
  return response.ok ? ((await response.json()) as ContactList) : null;
});

export async function ContactsSummary({ query }: Readonly<{ query: string }>) {
  const result = await getContacts(query);
  const texto = CONTACTOS.listado;
  return result ? texto.total(result.meta.total) : texto.resumenSinDatos;
}

export async function ContactsResults({
  query,
  params,
}: Readonly<{ query: string; params: ListParams }>) {
  const result = await getContacts(query);
  const texto = CONTACTOS.listado;
  if (!result) {
    return (
      <div className="data-card-alert">
        <Alert tone="error">{texto.errorCarga}</Alert>
      </div>
    );
  }
  const contacts = result.data;
  return (
    <>
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
          {!contacts.length && (
            <tr>
              <td colSpan={texto.columnas.length} className="empty-table">
                {texto.sinResultados}
              </td>
            </tr>
          )}
        </tbody>
      </Table>
      <Pagination
        basePath="/contactos"
        params={params}
        meta={result.meta}
        shown={contacts.length}
        label={texto.paginacion}
      />
    </>
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
