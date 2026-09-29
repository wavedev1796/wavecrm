"use client";

import { Check, IdCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Field } from "@/components/form-field";
import { LocationFields } from "@/components/location-fields";
import { PhoneField } from "@/components/phone-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { useFieldErrors } from "@/components/use-field-errors";
import { DOCUMENT_TYPES } from "@/lib/ecuador";
import { saveContact } from "./actions";
import { CompanyField } from "./company-field";
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
  const { formRef, error, onChange } = useFieldErrors(state.fieldErrors, {
    phoneCountry: "phone",
    documentType: "documentId",
    companyId: "company",
  });
  const [documentType, setDocumentType] = useState(state.values.documentType);
  const type = DOCUMENT_TYPES.find(({ value }) => value === documentType);

  useEffect(() => {
    if (!id && state.contactId) router.push(`/contactos/${state.contactId}`);
  }, [id, router, state.contactId]);

  const input = (field: keyof ContactFormValues) =>
    invalidProps(`contact-${field}`, error(field));
  const field = (name: keyof ContactFormValues, label: string) => ({
    id: `contact-${name}`,
    label,
    error: error(name),
  });

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
          <IdCard aria-hidden />
        </span>
        <div>
          <h2>{id ? "Editar contacto" : "Nuevo contacto"}</h2>
          <p>Los datos se validan al guardar.</p>
        </div>
      </header>
      {state.feedback && (
        <Alert tone={state.feedback.tone}>{state.feedback.message}</Alert>
      )}
      <div className="contact-form-grid">
        <Field {...field("firstName", "Nombre")}>
          <Input
            name="firstName"
            required
            maxLength={100}
            defaultValue={state.values.firstName}
            {...input("firstName")}
          />
        </Field>
        <Field {...field("lastName", "Apellido")}>
          <Input
            name="lastName"
            required
            maxLength={100}
            defaultValue={state.values.lastName}
            {...input("lastName")}
          />
        </Field>
        <Field id="contact-documentType" label="Tipo de documento">
          <select
            name="documentType"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
          >
            <option value="">Sin documento</option>
            {DOCUMENT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        {type && (
          <Field {...field("documentId", type.label)}>
            <Input
              name="documentId"
              inputMode={type.value === "PASAPORTE" ? "text" : "numeric"}
              placeholder={type.placeholder}
              defaultValue={state.values.documentId}
              {...input("documentId")}
            />
          </Field>
        )}
        <CompanyField
          defaultLabel={state.values.company}
          defaultId={state.values.companyId}
          error={error("company")}
        />
        <Field {...field("email", "Correo")}>
          <Input
            name="email"
            type="email"
            maxLength={64}
            placeholder="persona@empresa.ec"
            defaultValue={state.values.email}
            {...input("email")}
          />
        </Field>
        <PhoneField
          id="contact-phone"
          country={state.values.phoneCountry}
          number={state.values.phone}
          error={error("phone")}
        />
        <LocationFields
          idPrefix="contact"
          initialProvince={state.values.province}
          initialCanton={state.values.city}
          provinceError={error("province")}
          cantonError={error("city")}
        />
        <Field {...field("position", "Cargo")}>
          <Input
            name="position"
            maxLength={100}
            defaultValue={state.values.position}
            {...input("position")}
          />
        </Field>
        <Field {...field("tags", "Etiquetas")}>
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
