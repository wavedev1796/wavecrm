import {
  MailPlus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { authenticatedApi } from "@/lib/authenticated-api";
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
  role: "ADMIN" | "VENDEDOR";
  active: boolean;
  status: "active" | "inactive" | "pending";
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
          <Alert tone="error">
            No pudimos cargar los usuarios. Recarga la página.
          </Alert>
        )}

        <section className="user-summary" aria-label="Resumen de usuarios">
          <Card>
            <span>Total</span>
            <strong>{result?.meta.total ?? 0}</strong>
          </Card>
          <Card>
            <span>Activos en página</span>
            <strong>{counts.active}</strong>
          </Card>
          <Card>
            <span>Pendientes en página</span>
            <strong>{counts.pending}</strong>
          </Card>
          <Card>
            <span>Inactivos en página</span>
            <strong>{counts.inactive}</strong>
          </Card>
        </section>

        <details className="invite-panel card">
          <summary>
            <MailPlus />
            Invitar usuario
          </summary>
          <InviteUserForm />
          <p>
            La persona recibirá un enlace válido durante 48 horas para crear su
            contraseña.
          </p>
        </details>

        <Card className="data-card">
          <form className="table-toolbar" method="get">
            <label className="table-search">
              <Search />
              <span className="sr-only">Buscar usuario</span>
              <Input
                name="search"
                defaultValue={params.search}
                maxLength={SEARCH_MAX}
                placeholder="Nombre o correo…"
              />
            </label>
            <div>
              <select
                name="status"
                defaultValue={params.status ?? ""}
                aria-label="Filtrar por estado"
              >
                <option value="">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="pending">Pendientes</option>
                <option value="inactive">Inactivos</option>
              </select>
              <Button variant="secondary" type="submit">
                Filtrar
              </Button>
            </div>
          </form>
          <Table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Invitación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="contact-cell">
                      <span className="avatar">{initials(user.name)}</span>
                      <span>
                        <strong>{user.name}</strong>
                        <small>{user.email}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    {user.role === "ADMIN" ? "Administrador" : "Vendedor"}
                  </td>
                  <td>
                    <StatusBadge status={user.status} />
                  </td>
                  <td>
                    {user.invitationSentAt
                      ? formatDate(user.invitationSentAt)
                      : "—"}
                  </td>
                  <td>
                    <div className="row-actions">
                      <EditUserDialog user={user} />
                      {user.status === "pending" && (
                        <RowAction
                          action={resendInvitation}
                          id={user.id}
                          label="Reenviar invitación"
                        >
                          <RefreshCw aria-hidden />
                        </RowAction>
                      )}
                      {user.status === "active" && user.id !== me.id && (
                        <RowAction
                          action={deactivateUser}
                          id={user.id}
                          label="Desactivar"
                        >
                          <UserX aria-hidden />
                        </RowAction>
                      )}
                      {user.status === "inactive" && (
                        <RowAction
                          action={reactivateUser}
                          id={user.id}
                          label="Reactivar"
                        >
                          <UserCheck aria-hidden />
                        </RowAction>
                      )}
                      {user.id !== me.id && (
                        <RowAction
                          action={deleteUser}
                          id={user.id}
                          label="Eliminar"
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
                  <td colSpan={5} className="empty-table">
                    No hay usuarios que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          {meta && (
            <nav className="table-footer" aria-label="Paginación de usuarios">
              <span>
                {users.length
                  ? `Mostrando ${(meta.page - 1) * meta.limit + 1}–${(meta.page - 1) * meta.limit + users.length} de ${meta.total}`
                  : `Mostrando 0 de ${meta.total}`}
                {" · "}
                Página {meta.page} de {Math.max(meta.totalPages, 1)}
              </span>
              <div>
                {meta.page > 1 ? (
                  <a
                    className="button button--secondary"
                    href={usersPageHref(params, meta.page - 1)}
                  >
                    Anterior
                  </a>
                ) : (
                  <span
                    className="button button--secondary"
                    aria-disabled="true"
                  >
                    Anterior
                  </span>
                )}
                {meta.page < meta.totalPages ? (
                  <a
                    className="button button--secondary"
                    href={usersPageHref(params, meta.page + 1)}
                  >
                    Siguiente
                  </a>
                ) : (
                  <span
                    className="button button--secondary"
                    aria-disabled="true"
                  >
                    Siguiente
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

function StatusBadge({ status }: Readonly<{ status: User["status"] }>) {
  if (status === "active") return <Badge tone="success">Activo</Badge>;
  if (status === "pending")
    return <Badge tone="warning">Invitación pendiente</Badge>;
  return <Badge tone="neutral">Inactivo</Badge>;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-EC", { dateStyle: "medium" }).format(
    new Date(value),
  );
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
