import { MailPlus, RefreshCw, Search, Trash2, UserCheck, UserX } from "lucide-react";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { authenticatedApi } from "@/lib/authenticated-api";
import { SEARCH_MAX } from "@/lib/validation";
import { deactivateUser, deleteUser, reactivateUser, resendInvitation } from "./actions";
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

type PageProps = {
  searchParams: Promise<{ search?: string; status?: string }>;
};

const STATUSES = ["active", "inactive", "pending"];

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const meResponse = await authenticatedApi("/auth/me");
  const me = meResponse.ok
    ? ((await meResponse.json()) as { id: string; role: string })
    : null;
  if (me?.role !== "ADMIN") redirect("/pipeline");

  const query = new URLSearchParams({ page: "1", limit: "100" });
  if (params.search) query.set("search", params.search);
  if (params.status && STATUSES.includes(params.status)) query.set("status", params.status);
  const response = await authenticatedApi(`/users?${query}`);
  const result = response.ok
    ? ((await response.json()) as { data: User[]; meta: { total: number } })
    : null;
  const users = result?.data ?? [];

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
          <Alert tone="error">No pudimos cargar los usuarios. Recarga la página.</Alert>
        )}

        <section className="user-summary" aria-label="Resumen de usuarios">
          <Card>
            <span>Total</span>
            <strong>{result?.meta.total ?? 0}</strong>
          </Card>
          <Card>
            <span>Activos</span>
            <strong>{counts.active}</strong>
          </Card>
          <Card>
            <span>Pendientes</span>
            <strong>{counts.pending}</strong>
          </Card>
          <Card>
            <span>Inactivos</span>
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
                  <td>{user.role === "ADMIN" ? "Administrador" : "Vendedor"}</td>
                  <td>
                    <StatusBadge status={user.status} />
                  </td>
                  <td>
                    {user.invitationSentAt ? formatDate(user.invitationSentAt) : "—"}
                  </td>
                  <td>
                    <div className="row-actions">
                      <EditUserDialog user={user} />
                      {user.status === "pending" && (
                        <RowAction action={resendInvitation} id={user.id} label="Reenviar invitación">
                          <RefreshCw aria-hidden />
                        </RowAction>
                      )}
                      {user.status === "active" && user.id !== me.id && (
                        <RowAction action={deactivateUser} id={user.id} label="Desactivar">
                          <UserX aria-hidden />
                        </RowAction>
                      )}
                      {user.status === "inactive" && (
                        <RowAction action={reactivateUser} id={user.id} label="Reactivar">
                          <UserCheck aria-hidden />
                        </RowAction>
                      )}
                      {user.id !== me.id && (
                        <RowAction action={deleteUser} id={user.id} label="Eliminar">
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
        </Card>
      </UsersFeedbackProvider>
    </div>
  );
}

function StatusBadge({ status }: { status: User["status"] }) {
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
