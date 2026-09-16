"use client";

import { Check, Pencil, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateUser } from "./actions";

type EditableUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "VENDEDOR";
};

export function EditUserDialog({ user }: { user: EditableUser }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = `edit-user-title-${user.id}`;

  return (
    <>
      <button
        type="button"
        className="icon-button"
        title="Editar"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Pencil aria-hidden />
        <span className="sr-only">Editar {user.name}</span>
      </button>

      <dialog
        ref={dialogRef}
        className="user-dialog"
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="user-dialog-card">
          <header>
            <div>
              <span>Administración de usuarios</span>
              <h2 id={titleId}>Editar usuario</h2>
              <p>Actualiza sus datos y el nivel de acceso al CRM.</p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Cerrar"
              onClick={() => dialogRef.current?.close()}
            >
              <X aria-hidden />
            </button>
          </header>

          <form action={updateUser} className="edit-user-form">
            <input type="hidden" name="id" value={user.id} />
            <div className="edit-user-fields">
              <label>
                Nombre completo
                <Input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={user.name}
                />
              </label>
              <label>
                Correo electrónico
                <Input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  defaultValue={user.email}
                />
              </label>
              <label>
                Rol y permisos
                <select name="role" defaultValue={user.role}>
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                <small>
                  Los administradores pueden gestionar usuarios, roles y
                  accesos.
                </small>
              </label>
            </div>
            <footer>
              <Button
                type="button"
                variant="secondary"
                onClick={() => dialogRef.current?.close()}
              >
                Cancelar
              </Button>
              <Button type="submit" className="edit-user-submit">
                <Check aria-hidden />
                Aplicar cambios
              </Button>
            </footer>
          </form>
        </div>
      </dialog>
    </>
  );
}
