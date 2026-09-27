"use client";

import { useRef } from "react";
import { FormDialog } from "@/components/form-dialog";
import { ContactForm } from "./contact-form";

export function NewContactDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <FormDialog
      dialogRef={dialog}
      triggerLabel="Nuevo contacto"
      label="Crear nuevo contacto"
      closeLabel="Cerrar nuevo contacto"
    >
      <ContactForm embedded onCancel={() => dialog.current?.close()} />
    </FormDialog>
  );
}
