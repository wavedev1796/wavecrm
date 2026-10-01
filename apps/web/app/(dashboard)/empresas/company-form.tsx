"use client";

import { Building2, Check } from "lucide-react";
import { useActionState, useEffect } from "react";
import { Field } from "@/components/form-field";
import { LocationFields } from "@/components/location-fields";
import { PhoneField } from "@/components/phone-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { useFieldErrors } from "@/components/use-field-errors";
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

type Props = Readonly<{
  id?: string;
  initialValues?: CompanyFormValues;
  embedded?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}>;

export function CompanyForm({
  id,
  initialValues = emptyCompanyValues,
  embedded = true,
  onSaved,
  onCancel,
}: Props) {
  const [state, action, pending] = useActionState(saveCompany, {
    ...initial,
    values: initialValues,
  });
  const { formRef, error, onChange } = useFieldErrors(state.fieldErrors, {
    phoneCountry: "phone",
  });
  useEffect(() => {
    if (state.saved) onSaved?.();
  }, [state, onSaved]);

  const input = (field: keyof CompanyFormValues) =>
    ({
      id: `company-${field}`,
      ...invalidProps(`company-${field}`, error(field)),
    });
  const text = (
    field: keyof CompanyFormValues,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <Field
      id={`company-${field}`}
      label={label}
      error={error(field)}
      required={props.required}
    >
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
      className={`contact-form ${embedded ? "contact-form--modal" : "card"}`}
      noValidate
      aria-busy={pending || undefined}
    >
      {id && <input type="hidden" name="id" value={id} />}
      <header>
        <span className="contact-form-icon">
          <Building2 aria-hidden />
        </span>
        <div>
          <h2>{id ? "Editar empresa" : "Añadir empresa"}</h2>
          <p>
            Los campos con * son obligatorios. Los datos se validan al guardar.
          </p>
        </div>
      </header>
      {state.feedback && (
        <Alert tone={state.feedback.tone}>{state.feedback.message}</Alert>
      )}
      <div className="contact-form-grid">
        {text("name", "Nombre comercial", { maxLength: 120, required: true })}
        {text("legalName", "Razón social", { maxLength: 160 })}
        {text("taxId", "RUC", {
          required: true,
          inputMode: "numeric",
          placeholder: "1791234561001",
        })}
        {text("website", "Sitio web", {
          type: "url",
          maxLength: 200,
          placeholder: "https://empresa.ec",
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
        <LocationFields
          idPrefix="company"
          initialProvince={state.values.province}
          initialCanton={state.values.city}
          provinceError={error("province")}
          cantonError={error("city")}
        />
        {text("address", "Dirección", { maxLength: 200 })}
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
          {id ? "Guardar cambios" : "Crear empresa"}
        </Button>
      </footer>
    </form>
  );
}
