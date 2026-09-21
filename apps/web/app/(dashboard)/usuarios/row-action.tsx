"use client";

import type { ReactNode } from "react";
import type { Feedback } from "./actions";
import { useShowFeedback } from "./users-feedback";

/** Acción de una fila (desactivar, reactivar, reenviar, eliminar). El resultado va al aviso de la página. */
export function RowAction({
  action,
  id,
  label,
  children,
}: Readonly<{
  action: (formData: FormData) => Promise<Feedback>;
  id: string;
  label: string;
  children: ReactNode;
}>) {
  const show = useShowFeedback();

  return (
    <form action={async (formData) => show(await action(formData))}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="icon-button" title={label}>
        {children}
        <span className="sr-only">{label}</span>
      </button>
    </form>
  );
}
