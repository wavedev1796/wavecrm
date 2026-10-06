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
import { Select } from "@/components/ui/select";
import { useFieldErrors } from "@/components/use-field-errors";
import { CONTACTOS } from "@/content/contactos";
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
  const texto = CONTACTOS.formulario;
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
  const type =
    DOCUMENT_TYPES.find(({ value }) => value === documentType) ??
    DOCUMENT_TYPES[0];

  useEffect(() => {
    if (!id && state.contactId) router.push(`/contactos/${state.contactId}`);
  }, [id, router, state.contactId]);

  const input = (field: keyof ContactFormValues) =>
    ({
      id: `contact-${field}`,
      ...invalidProps(`contact-${field}`, error(field)),
    });
  const field = (
    name: keyof ContactFormValues,
    label: string,
    required = false,
  ) => ({
    id: `contact-${name}`,
    label,
    error: error(name),
    required,
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
          <h2>{id ? texto.editar : texto.nuevo}</h2>
          <p>{texto.ayuda}</p>
        </div>
      </header>
      {state.feedback && (
        <Alert tone={state.feedback.tone}>{state.feedback.message}</Alert>
      )}
      <div className="contact-form-grid">
        <Field {...field("firstName", texto.campos.nombre, true)}>
          <Input
            name="firstName"
            required
            maxLength={100}
            defaultValue={state.values.firstName}
            {...input("firstName")}
          />
        </Field>
        <Field {...field("lastName", texto.campos.apellido, true)}>
          <Input
            name="lastName"
            required
            maxLength={100}
            defaultValue={state.values.lastName}
            {...input("lastName")}
          />
        </Field>
        <Field
          id="contact-documentType"
          label={texto.campos.tipoDocumento}
          required
        >
          <Select
            id="contact-documentType"
            name="documentType"
            required
            value={type.value}
            onChange={(event) => setDocumentType(event.target.value)}
          >
            {DOCUMENT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field {...field("documentId", type.label, true)}>
          <Input
            name="documentId"
            required
            inputMode={type.value === "PASAPORTE" ? "text" : "numeric"}
            placeholder={type.placeholder}
            defaultValue={state.values.documentId}
            {...input("documentId")}
          />
        </Field>
        <CompanyField
          defaultLabel={state.values.company}
          defaultId={state.values.companyId}
          error={error("company")}
        />
        <Field {...field("email", texto.campos.correo)}>
          <Input
            name="email"
            type="email"
            maxLength={64}
            placeholder={texto.campos.correoPlaceholder}
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
        <Field {...field("position", texto.campos.cargo)}>
          <Input
            name="position"
            maxLength={100}
            defaultValue={state.values.position}
            {...input("position")}
          />
        </Field>
        <Field {...field("tags", texto.campos.etiquetas)}>
          <Input
            name="tags"
            placeholder={texto.campos.etiquetasPlaceholder}
            defaultValue={state.values.tags}
            {...input("tags")}
          />
        </Field>
      </div>
      <footer>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {texto.cancelar}
          </Button>
        )}
        <Button type="submit" loading={pending}>
          <Check aria-hidden />
          {id ? texto.guardar : texto.crear}
        </Button>
      </footer>
    </form>
  );
}
