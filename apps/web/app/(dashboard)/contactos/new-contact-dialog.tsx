"use client";

import { Plus, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ContactForm } from "./contact-form";

export function NewContactDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button type="button" onClick={() => dialog.current?.showModal()}>
        <Plus aria-hidden />
        Nuevo contacto
      </Button>
      <dialog
        ref={dialog}
        className="contact-dialog"
        aria-label="Crear nuevo contacto"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="contact-dialog-panel">
          <button
            type="button"
            className="icon-button contact-dialog-close"
            aria-label="Cerrar nuevo contacto"
            onClick={() => dialog.current?.close()}
          >
            <X aria-hidden />
          </button>
          <ContactForm embedded onCancel={() => dialog.current?.close()} />
        </div>
      </dialog>
    </>
  );
}
