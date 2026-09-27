"use client";

import { Plus, X } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";

type Props = Readonly<{
  dialogRef: RefObject<HTMLDialogElement | null>;
  /** Texto del botón que abre el diálogo ("Nuevo contacto"). */
  triggerLabel: string;
  label: string;
  closeLabel: string;
  children: React.ReactNode;
}>;

/** Alta en un diálogo modal: botón que lo abre, X para cerrar; Esc y un clic en el fondo también lo cierran. */
export function FormDialog({
  dialogRef,
  triggerLabel,
  label,
  closeLabel,
  children,
}: Props) {
  return (
    <>
      <Button type="button" onClick={() => dialogRef.current?.showModal()}>
        <Plus aria-hidden />
        {triggerLabel}
      </Button>
      <dialog
        ref={dialogRef}
        className="contact-dialog"
        aria-label={label}
        closedby="any" // NOSONAR: atributo HTML válido (tipado en @types/react) que la regla aún no conoce.
      >
        <div className="contact-dialog-panel">
          <button
            type="button"
            className="icon-button contact-dialog-close"
            aria-label={closeLabel}
            onClick={() => dialogRef.current?.close()}
          >
            <X aria-hidden />
          </button>
          {children}
        </div>
      </dialog>
    </>
  );
}
