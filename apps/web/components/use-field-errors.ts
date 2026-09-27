"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

/**
 * Errores del último envío: no se valida mientras se escribe. El error de un campo se oculta al modificarlo
 * y vuelve solo si sigue mal al guardar de nuevo. Tras cada envío, el foco va al primer campo con error.
 * `aliases` traduce el `name` de un control al campo de su error (`phoneCountry` → `phone`).
 */
export function useFieldErrors<Field extends string>(
  fieldErrors: Partial<Record<Field, string>>,
  aliases: Partial<Record<string, NoInfer<Field>>> = {},
) {
  const formRef = useRef<HTMLFormElement>(null);
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  const [shown, setShown] = useState(fieldErrors);
  if (shown !== fieldErrors) {
    // Un envío nuevo: sus errores se ven todos otra vez.
    setShown(fieldErrors);
    setEdited(new Set());
  }

  useEffect(() => {
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [fieldErrors]);

  return {
    formRef,
    error: (field: Field) =>
      edited.has(field) ? undefined : fieldErrors[field],
    onChange: (event: FormEvent<HTMLFormElement>) => {
      const name = (event.target as HTMLInputElement).name;
      const field = aliases[name] ?? name;
      if (field && !edited.has(field)) setEdited(new Set(edited).add(field));
    },
  };
}
