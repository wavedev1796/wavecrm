"use client";

import { Pencil } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { FormDialog } from "@/components/form/form-dialog";
import { Button } from "@/components/ui/button";
import { EMPRESAS } from "@/content/empresas";
import { CompanyForm } from "./company-form";
import type { CompanyFormValues } from "./company-form-state";

export function CompanyEditDialog({
  id,
  initialValues,
}: Readonly<{ id: string; initialValues: CompanyFormValues }>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [savedMessage, setSavedMessage] = useState("");
  const saved = useCallback(() => {
    dialog.current?.close();
    setSavedMessage(EMPRESAS.formulario.actualizada);
    router.refresh();
  }, [router]);
  const text = EMPRESAS.dialogo.editar;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="action-button action-button--edit"
        onClick={() => dialog.current?.showModal()}
      >
        <Pencil aria-hidden />
        {text.abrir}
      </Button>
      {savedMessage && <Alert tone="success" className="company-edit-feedback">{savedMessage}</Alert>}
      <FormDialog
        dialogRef={dialog}
        label={text.etiqueta}
        closeLabel={text.cerrar}
      >
        <CompanyForm
          id={id}
          initialValues={initialValues}
          onSaved={saved}
          onCancel={() => dialog.current?.close()}
        />
      </FormDialog>
    </>
  );
}
