"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { CompanyForm } from "./company-form";

export function NewCompanyDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const saved = useCallback(() => {
    dialog.current?.close();
    setFormKey((key) => key + 1); // el próximo alta empieza vacío
    router.replace("/empresas?creada=1", { scroll: false });
  }, [router]);

  return (
    <FormDialog
      dialogRef={dialog}
      triggerLabel="Añadir empresa"
      label="Añadir empresa"
      closeLabel="Cerrar añadir empresa"
    >
      <CompanyForm
        key={formKey}
        onSaved={saved}
        onCancel={() => dialog.current?.close()}
      />
    </FormDialog>
  );
}
