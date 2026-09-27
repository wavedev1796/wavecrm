"use client";

import { Building2, Check } from "lucide-react";
import { useActionState, useEffect } from "react";
import { Field } from "@/components/form-field";
import { PhoneField } from "@/components/phone-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { useFieldErrors } from "@/components/use-field-errors";
import { PROVINCES } from "@/lib/ecuador";
import { saveCompany } from "./actions";
import {
  emptyCompanyValues,
  type CompanyFormState,
  type CompanyFormValues,
} from "./company-form-state";

const initial: CompanyFormState = {
  feedback: null,
  fieldErrors: {},
  values: emptyCompanyValues,
};

type Props = Readonly<{ onSaved?: () => void; onCancel?: () => void }>;

export function CompanyForm({ onSaved, onCancel }: Props) {
  const [state, action, pending] = useActionState(saveCompany, initial);
  const { formRef, error, onChange } = useFieldErrors(state.fieldErrors, {
    phoneCountry: "phone",
  });
  useEffect(() => {
    if (state.saved) onSaved?.();
  }, [state, onSaved]);

  const input = (field: keyof CompanyFormValues) =>
    invalidProps(`company-${field}`, error(field));
  const text = (
    field: keyof CompanyFormValues,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <Field id={`company-${field}`} label={label} error={error(field)}>
      <Input
        name={field}
        defaultValue={state.values[field]}
        {...props}
        {...input(field)}
      />
    </Field>
  );

  return (
    <form
      ref={formRef}
      action={action}
      onChange={onChange}
      className="contact-form contact-form--modal"
      noValidate
      aria-busy={pending || undefined}
    >
      <header>
        <span className="contact-form-icon">
          <Building2 aria-hidden />
        </span>
        <div>
          <h2>Añadir empresa</h2>
          <p>Los datos se validan al guardar.</p>
        </div>
      </header>
      {state.feedback && <Alert tone="error">{state.feedback.message}</Alert>}
      <div className="contact-form-grid">
        {text("name", "Nombre comercial", { maxLength: 120 })}
        {text("legalName", "Razón social", { maxLength: 160 })}
        {text("taxId", "RUC", {
          inputMode: "numeric",
          placeholder: "1791234561001",
        })}
        {text("email", "Correo", {
          type: "email",
          maxLength: 64,
          placeholder: "ventas@empresa.ec",
        })}
        <PhoneField
          id="company-phone"
          country={state.values.phoneCountry}
          number={state.values.phone}
          error={error("phone")}
        />
        <Field
          id="company-province"
          label="Provincia"
          error={error("province")}
        >
          <select
            name="province"
            defaultValue={state.values.province}
            {...input("province")}
          >
            <option value="">Sin provincia</option>
            {PROVINCES.map((province) => (
              <option key={province}>{province}</option>
            ))}
          </select>
        </Field>
        {text("city", "Ciudad", { maxLength: 60 })}
        {text("tags", "Etiquetas", { placeholder: "cliente, distribuidor" })}
      </div>
      <footer>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={pending}>
          <Check aria-hidden />
          Crear empresa
        </Button>
      </footer>
    </form>
  );
}
