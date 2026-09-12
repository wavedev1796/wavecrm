import {
  AlertCircle,
  CheckCircle2,
  MailPlus,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { authenticatedApi } from "@/lib/authenticated-api";
import {
  deactivateUser,
  deleteUser,
  inviteUser,
  reactivateUser,
  resendInvitation,
  updateUser,
} from "./actions";

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
  searchParams: Promise<{
    search?: string;
    status?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const meResponse = await authenticatedApi("/auth/me");
  const me = meResponse.ok
    ? ((await meResponse.json()) as { id: string; role: string })
    : null;
  if (me?.role !== "ADMIN") redirect("/pipeline");

  const query = new URLSearchParams({ page: "1", limit: "100" });
  if (params.search) query.set("search", params.search);
  if (["active", "inactive", "pending"].includes(params.status ?? ""))
    query.set("status", params.status!);
  const response = await authenticatedApi(`/users?${query}`);
  const result = response.ok
    ? ((await response.json()) as { data: User[]; meta: { total: number } })
    : { data: [], meta: { total: 0 } };

  const counts = result.data.reduce(
    (value, user) => {
      value[user.status] += 1;
      return value;
    },
    { active: 0, inactive: 0, pending: 0 },
  );

  return (
    <div className="users-page">
      {(params.success || params.error) && (
        <div
          className={
            params.error
              ? "page-message page-message--error"
              : "page-message page-message--success"
          }
        >
          {params.error ? <AlertCircle /> : <CheckCircle2 />}
          {params.error ?? params.success}
        </div>
      )}

      <section className="user-summary" aria-label="Resumen de usuarios">
        <Card>
          <span>Total</span>
          <strong>{result.meta.total}</strong>
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
        <form action={inviteUser} className="user-form">
          <label>
            Nombre
            <Input
              name="name"
              required
              maxLength={100}
              placeholder="Nombre completo"
            />
          </label>
          <label>
            Correo
            <Input
              name="email"
              required
              type="email"
              maxLength={254}
              placeholder="persona@empresa.ec"
            />
          </label>
          <label>
            Rol
            <select name="role" defaultValue="VENDEDOR">
              <option value="VENDEDOR">Vendedor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
          <Button type="submit">
            <MailPlus />
            Enviar invitación
          </Button>
        </form>
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
            {result.data.map((user) => (
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
                  {user.invitationSentAt
                    ? formatDate(user.invitationSentAt)
                    : "—"}
                </td>
                <td>
                  <div className="row-actions">
                    <details className="edit-popover">
                      <summary className="icon-button" title="Editar">
                        <Pencil />
                        <span className="sr-only">Editar {user.name}</span>
                      </summary>
                      <form action={updateUser} className="edit-form">
                        <input type="hidden" name="id" value={user.id} />
                        <label>
                          Nombre
                          <Input
                            name="name"
                            required
                            defaultValue={user.name}
                          />
                        </label>
                        <label>
                          Correo
                          <Input
                            name="email"
                            type="email"
                            required
                            defaultValue={user.email}
                          />
                        </label>
                        <label>
                          Rol
                          <select name="role" defaultValue={user.role}>
                            <option value="VENDEDOR">Vendedor</option>
                            <option value="ADMIN">Administrador</option>
                          </select>
                        </label>
                        <Button type="submit">Guardar cambios</Button>
                      </form>
                    </details>
                    {user.status === "pending" && (
                      <Action
                        action={resendInvitation}
                        id={user.id}
                        label="Reenviar invitación"
                      >
                        <RefreshCw />
                      </Action>
                    )}
                    {user.status === "active" && user.id !== me.id && (
                      <Action
                        action={deactivateUser}
                        id={user.id}
                        label="Desactivar"
                      >
                        <UserX />
                      </Action>
                    )}
                    {user.status === "inactive" && (
                      <Action
                        action={reactivateUser}
                        id={user.id}
                        label="Reactivar"
                      >
                        <UserCheck />
                      </Action>
                    )}
                    {user.id !== me.id && (
                      <Action action={deleteUser} id={user.id} label="Eliminar">
                        <Trash2 />
                      </Action>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!result.data.length && (
              <tr>
                <td colSpan={5} className="empty-table">
                  No hay usuarios que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function Action({
  action,
  id,
  label,
  children,
}: {
  action: (data: FormData) => Promise<void>;
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button className="icon-button" title={label}>
        {children}
        <span className="sr-only">{label}</span>
      </button>
    </form>
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
