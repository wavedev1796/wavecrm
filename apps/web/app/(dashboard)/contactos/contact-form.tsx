"use client";

import { Check, IdCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import {
  cedulaError,
  normalizeDigits,
  phoneError,
  PROVINCES,
  provinceError,
  rucError,
} from "@/lib/ecuador";
import { nameError, normalizeName } from "@/lib/validation";
import { saveContact } from "./actions";
import {
  emptyContactValues,
  type ContactFormState,
  type ContactFormValues,
} from "./contact-form-state";

type ContactFormProps = Readonly<{
  id?: string;
  initialValues?: ContactFormValues;
  embedded?: boolean;
  onCancel?: () => void;
}>;

export function ContactForm({
  id,
  initialValues = emptyContactValues,
  embedded = false,
  onCancel,
}: ContactFormProps) {
  const router = useRouter();
  const initial: ContactFormState = {
    feedback: null,
    fieldErrors: {},
    values: initialValues,
  };
  const [state, action, pending] = useActionState(saveContact, initial);
  const [visual, setVisual] = useState<
    Partial<Record<keyof ContactFormValues, string>>
  >({});

  useEffect(() => {
    if (!id && state.contactId) router.push(`/contactos/${state.contactId}`);
  }, [id, router, state.contactId]);

  const error = (field: keyof ContactFormValues) =>
    visual[field] ?? state.fieldErrors[field];
  const validate = (field: keyof ContactFormValues, value: string) => {
    let message: string | null = null;
    if (field === "firstName") message = nameError(normalizeName(value));
    if (field === "lastName")
      message = nameError(normalizeName(value), "apellido");
    if (field === "documentId") message = cedulaError(normalizeDigits(value));
    if (field === "companyTaxId") message = rucError(normalizeDigits(value));
    if (field === "phone") message = phoneError(value);
    if (field === "province") message = provinceError(value);
    setVisual((current) => {
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  const input = (field: keyof ContactFormValues) =>
    invalidProps(`contact-${field}`, error(field));

  return (
    <form
      action={action}
      className={`contact-form ${embedded ? "contact-form--modal" : "card"}`}
      noValidate
      aria-busy={pending || undefined}
    >
      {id && <input type="hidden" name="id" value={id} />}
      <header>
        <span className="contact-form-icon">
          <IdCard aria-hidden />
        </span>
        <div>
          <h2>{id ? "Editar contacto" : "Nuevo contacto"}</h2>
          <p>Los datos de Ecuador se validan antes de guardar.</p>
        </div>
      </header>
      {state.feedback && (
        <Alert tone={state.feedback.tone}>{state.feedback.message}</Alert>
      )}
      <div className="contact-form-grid">
        <Field label="Nombre" field="firstName" error={error("firstName")}>
          <Input
            name="firstName"
            required
            maxLength={100}
            defaultValue={state.values.firstName}
            onBlur={(e) => validate("firstName", e.currentTarget.value)}
            {...input("firstName")}
          />
        </Field>
        <Field label="Apellido" field="lastName" error={error("lastName")}>
          <Input
            name="lastName"
            required
            maxLength={100}
            defaultValue={state.values.lastName}
            onBlur={(e) => validate("lastName", e.currentTarget.value)}
            {...input("lastName")}
          />
        </Field>
        <Field label="Cédula" field="documentId" error={error("documentId")}>
          <Input
            name="documentId"
            inputMode="numeric"
            placeholder="1712345675"
            defaultValue={state.values.documentId}
            onBlur={(e) => validate("documentId", e.currentTarget.value)}
            {...input("documentId")}
          />
        </Field>
        <Field
          label="RUC de la empresa"
          field="companyTaxId"
          error={error("companyTaxId")}
        >
          <Input
            name="companyTaxId"
            inputMode="numeric"
            placeholder="1791234561001"
            defaultValue={state.values.companyTaxId}
            onBlur={(e) => validate("companyTaxId", e.currentTarget.value)}
            {...input("companyTaxId")}
          />
        </Field>
        <Field label="Correo" field="email" error={error("email")}>
          <Input
            name="email"
            type="email"
            maxLength={64}
            placeholder="persona@empresa.ec"
            defaultValue={state.values.email}
            {...input("email")}
          />
        </Field>
        <Field label="Teléfono" field="phone" error={error("phone")}>
          <Input
            name="phone"
            placeholder="0991234567"
            defaultValue={state.values.phone}
            onBlur={(e) => validate("phone", e.currentTarget.value)}
            {...input("phone")}
          />
        </Field>
        <Field label="Provincia" field="province" error={error("province")}>
          <select
            name="province"
            defaultValue={state.values.province}
            onBlur={(e) => validate("province", e.currentTarget.value)}
            {...input("province")}
          >
            <option value="">Sin provincia</option>
            {PROVINCES.map((province) => (
              <option key={province}>{province}</option>
            ))}
          </select>
        </Field>
        <Field label="Ciudad" field="city" error={error("city")}>
          <Input
            name="city"
            maxLength={60}
            defaultValue={state.values.city}
            {...input("city")}
          />
        </Field>
        <Field label="Cargo" field="position" error={error("position")}>
          <Input
            name="position"
            maxLength={100}
            defaultValue={state.values.position}
            {...input("position")}
          />
        </Field>
        <Field label="Etiquetas" field="tags" error={error("tags")}>
          <Input
            name="tags"
            placeholder="cliente, vip"
            defaultValue={state.values.tags}
            {...input("tags")}
          />
        </Field>
      </div>
      <footer>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={pending}>
          <Check aria-hidden />
          {id ? "Guardar cambios" : "Crear contacto"}
        </Button>
      </footer>
    </form>
  );
}

function Field({
  label,
  field,
  error,
  children,
}: Readonly<{
  label: string;
  field: keyof ContactFormValues;
  error?: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="form-field">
      <label>
        {label}
        {children}
      </label>
      <FieldError id={`contact-${field}`} message={error} />
    </div>
  );
}
