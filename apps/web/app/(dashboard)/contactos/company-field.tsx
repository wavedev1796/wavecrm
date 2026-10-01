"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { normalizeDigits } from "@/lib/ecuador";
import { searchCompanies } from "./actions";
import type { CompanyOption } from "./contact-form-state";

const DELAY_MS = 300;

/** La opción cuyo texto coincide, o cuyo RUC es el pegado (con o sin espacios). */
const matchOf = (options: CompanyOption[], text: string) =>
  options.find(
    (option) =>
      option.label === text ||
      (option.taxId !== null && option.taxId === normalizeDigits(text)),
  );

type Props = Readonly<{
  defaultLabel: string;
  defaultId: string;
  error?: string;
}>;

/** Empresa registrada por nombre o RUC, con las sugerencias nativas del navegador (`<datalist>`). Es opcional. */
export function CompanyField({ defaultLabel, defaultId, error }: Props) {
  const listId = useId();
  const [options, setOptions] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState(defaultId);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="form-field">
      <label>
        Empresa donde trabaja (opcional)
        <Input
          name="company"
          list={listId}
          defaultValue={defaultLabel}
          autoComplete="off"
          placeholder="Busca por nombre o RUC"
          onChange={(event) => {
            const text = event.currentTarget.value.trim();
            const match = matchOf(options, text);
            setCompanyId(match?.id ?? "");
            clearTimeout(timer.current);
            if (match || !text) return;
            timer.current = setTimeout(async () => {
              // Si la sesión venció, la acción redirige al login y aquí llega undefined.
              const found = (await searchCompanies(text)) ?? [];
              setOptions(found);
              const exact = matchOf(found, text);
              if (exact) setCompanyId(exact.id);
            }, DELAY_MS);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error
              ? "contact-company-hint contact-company-error"
              : "contact-company-hint"
          }
        />
      </label>
      <p id="contact-company-hint" className="field-hint">
        Déjalo vacío si trabaja de forma independiente.
      </p>
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.id} value={option.label} />
        ))}
      </datalist>
      <input type="hidden" name="companyId" value={companyId} />
      <FieldError id="contact-company" message={error} />
    </div>
  );
}
