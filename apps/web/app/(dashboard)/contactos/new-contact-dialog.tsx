"use client";

import { useRef } from "react";
import { FormDialog } from "@/components/form-dialog";
import { CONTACTOS } from "@/content/contactos";
import { ContactForm } from "./contact-form";

export function NewContactDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <FormDialog
      dialogRef={dialog}
      triggerLabel={CONTACTOS.dialogo.abrir}
      label={CONTACTOS.dialogo.etiqueta}
      closeLabel={CONTACTOS.dialogo.cerrar}
    >
      <ContactForm embedded onCancel={() => dialog.current?.close()} />
    </FormDialog>
  );
}
