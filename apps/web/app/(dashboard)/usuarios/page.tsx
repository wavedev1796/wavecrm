import {
  MailPlus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { redirect } from "next/navigation";
import type { UserRole } from "@wave/shared";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table } from "@/components/ui/table";
import { ROL_USUARIO } from "@/content/catalogos";
import { COMUN } from "@/content/comun";
import { USUARIOS, type EstadoUsuario } from "@/content/usuarios";
import { authenticatedApi } from "@/lib/authenticated-api";
import { formatDate, initials } from "@/lib/format";
import { SEARCH_MAX } from "@/lib/validation";
import {
  deactivateUser,
  deleteUser,
  reactivateUser,
  resendInvitation,
} from "./actions";
import { EditUserDialog } from "./edit-user-dialog";
import { InviteUserForm } from "./invite-user-form";
import { RowAction } from "./row-action";
import { UsersFeedbackProvider } from "./users-feedback";

type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  status: EstadoUsuario;
  invitationSentAt: string | null;
  invitationExpiresAt: string | null;
};

type PageProps = Readonly<{
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}>;

const STATUSES = new Set(["active", "inactive", "pending"]);
const PAGE_SIZE = 10;

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const meResponse = await authenticatedApi("/auth/me");
  const me = meResponse.ok
    ? ((await meResponse.json()) as { id: string; role: string })
    : null;
  if (me?.role !== "ADMIN") redirect("/pipeline");

  const requestedPage = positivePage(params.page);
  const query = new URLSearchParams({
    page: String(requestedPage),
    limit: String(PAGE_SIZE),
  });
  if (params.search) query.set("search", params.search);
  if (params.status && STATUSES.has(params.status))
    query.set("status", params.status);
  const response = await authenticatedApi(`/users?${query}`);
  const result = response.ok
    ? ((await response.json()) as {
        data: User[];
        meta: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      })
    : null;
  const users = result?.data ?? [];
  const meta = result?.meta;

  const counts = users.reduce(
    (value, user) => {
      value[user.status] += 1;
      return value;
    },
    { active: 0, inactive: 0, pending: 0 },
  );

  return (
    <div className="users-page">
      <UsersFeedbackProvider>
        {!result && (
          <Alert tone="error">{USUARIOS.errorCarga}</Alert>
        )}

        <section className="user-summary" aria-label={USUARIOS.resumen.etiqueta}>
          <Card>
            <span>{USUARIOS.resumen.total}</span>
            <strong>{result?.meta.total ?? 0}</strong>
          </Card>
          <Card>
            <span>{USUARIOS.resumen.activos}</span>
            <strong>{counts.active}</strong>
          </Card>
          <Card>
            <span>{USUARIOS.resumen.pendientes}</span>
            <strong>{counts.pending}</strong>
          </Card>
          <Card>
            <span>{USUARIOS.resumen.inactivos}</span>
            <strong>{counts.inactive}</strong>
          </Card>
        </section>

        <details className="invite-panel card">
          <summary>
            <MailPlus />
            {USUARIOS.invitar.titulo}
          </summary>
          <InviteUserForm />
          <p>{USUARIOS.invitar.aviso}</p>
        </details>

        <Card className="data-card users-data-card">
          <form className="table-toolbar users-toolbar" method="get">
            <label className="table-search">
              <Search />
              <span className="sr-only">{USUARIOS.filtros.buscar}</span>
              <Input
                name="search"
                defaultValue={params.search}
                maxLength={SEARCH_MAX}
                placeholder={USUARIOS.filtros.buscarPlaceholder}
              />
            </label>
            <div>
              <Select
                name="status"
                defaultValue={params.status ?? ""}
                aria-label={USUARIOS.filtros.estado}
              >
                <option value="">{USUARIOS.filtros.todos}</option>
                <option value="active">{USUARIOS.filtros.activos}</option>
                <option value="pending">{USUARIOS.filtros.pendientes}</option>
                <option value="inactive">{USUARIOS.filtros.inactivos}</option>
              </Select>
              <Button variant="secondary" type="submit">
                {USUARIOS.filtros.filtrar}
              </Button>
            </div>
          </form>
          <Table className="users-table">
            <thead>
              <tr>
                {USUARIOS.columnas.map((columna) => (
                  <th key={columna}>{columna}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td data-label={USUARIOS.columnas[0]}>
                    <div className="contact-cell">
                      <span className="avatar">{initials(user.name)}</span>
                      <span>
                        <strong>{user.name}</strong>
                        <small>{user.email}</small>
                      </span>
                    </div>
                  </td>
                  <td data-label={USUARIOS.columnas[1]}>
                    {ROL_USUARIO[user.role]}
                  </td>
                  <td data-label={USUARIOS.columnas[2]}>
                    <StatusBadge status={user.status} />
                  </td>
                  <td data-label={USUARIOS.columnas[3]}>
                    {user.invitationSentAt
                      ? formatDate(user.invitationSentAt)
                      : COMUN.sinDato}
                  </td>
                  <td data-label={USUARIOS.columnas[4]}>
                    <div className="row-actions">
                      <EditUserDialog user={user} />
                      {user.status === "pending" && (
                        <RowAction
                          action={resendInvitation}
                          id={user.id}
                          label={USUARIOS.acciones.reenviar}
                        >
                          <RefreshCw aria-hidden />
                        </RowAction>
                      )}
                      {user.status === "active" && user.id !== me.id && (
                        <RowAction
                          action={deactivateUser}
                          id={user.id}
                          label={USUARIOS.acciones.desactivar}
                        >
                          <UserX aria-hidden />
                        </RowAction>
                      )}
                      {user.status === "inactive" && (
                        <RowAction
                          action={reactivateUser}
                          id={user.id}
                          label={USUARIOS.acciones.reactivar}
                        >
                          <UserCheck aria-hidden />
                        </RowAction>
                      )}
                      {user.id !== me.id && (
                        <RowAction
                          action={deleteUser}
                          id={user.id}
                          label={USUARIOS.acciones.eliminar}
                        >
                          <Trash2 aria-hidden />
                        </RowAction>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {result && !users.length && (
                <tr>
                  <td colSpan={USUARIOS.columnas.length} className="empty-table">
                    {USUARIOS.sinResultados}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          {meta && (
            <nav className="table-footer" aria-label={USUARIOS.paginacion}>
              <span>
                {users.length
                  ? COMUN.paginacion.rango(
                      (meta.page - 1) * meta.limit + 1,
                      (meta.page - 1) * meta.limit + users.length,
                      meta.total,
                    )
                  : COMUN.paginacion.vacia(meta.total)}{" "}
                {COMUN.paginacion.pagina(meta.page, Math.max(meta.totalPages, 1))}
              </span>
              <div>
                {meta.page > 1 ? (
                  <a
                    className="button button--secondary"
                    href={usersPageHref(params, meta.page - 1)}
                  >
                    {COMUN.paginacion.anterior}
                  </a>
                ) : (
                  <span
                    className="button button--secondary"
                    aria-disabled="true"
                  >
                    {COMUN.paginacion.anterior}
                  </span>
                )}
                {meta.page < meta.totalPages ? (
                  <a
                    className="button button--secondary"
                    href={usersPageHref(params, meta.page + 1)}
                  >
                    {COMUN.paginacion.siguiente}
                  </a>
                ) : (
                  <span
                    className="button button--secondary"
                    aria-disabled="true"
                  >
                    {COMUN.paginacion.siguiente}
                  </span>
                )}
              </div>
            </nav>
          )}
        </Card>
      </UsersFeedbackProvider>
    </div>
  );
}

const TONO_ESTADO = {
  active: "success",
  pending: "warning",
  inactive: "neutral",
} as const satisfies Record<EstadoUsuario, string>;

function StatusBadge({ status }: Readonly<{ status: EstadoUsuario }>) {
  return <Badge tone={TONO_ESTADO[status]}>{USUARIOS.estados[status]}</Badge>;
}



function positivePage(value?: string) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function usersPageHref(
  params: { search?: string; status?: string },
  page: number,
) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status && STATUSES.has(params.status)) {
    query.set("status", params.status);
  }
  query.set("page", String(page));
  return `/usuarios?${query}`;
}
