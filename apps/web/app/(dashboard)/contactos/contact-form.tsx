"use client";

import { Check, IdCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Field } from "@/components/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { useFieldErrors } from "@/components/use-field-errors";
import { PROVINCES } from "@/lib/ecuador";
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
  const { formRef, error, onChange } = useFieldErrors(state.fieldErrors);

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
        <Field {...field("documentId", "Cédula")}>
          <Input
            name="documentId"
            inputMode="numeric"
            placeholder="1712345675"
            defaultValue={state.values.documentId}
            {...input("documentId")}
          />
        </Field>
        <Field {...field("companyTaxId", "RUC de la empresa")}>
          <Input
            name="companyTaxId"
            inputMode="numeric"
            placeholder="1791234561001"
            defaultValue={state.values.companyTaxId}
            {...input("companyTaxId")}
          />
        </Field>
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
        <Field {...field("phone", "Teléfono")}>
          <Input
            name="phone"
            placeholder="0991234567"
            defaultValue={state.values.phone}
            {...input("phone")}
          />
        </Field>
        <Field {...field("province", "Provincia")}>
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
        <Field {...field("city", "Ciudad")}>
          <Input
            name="city"
            maxLength={60}
            defaultValue={state.values.city}
            {...input("city")}
          />
        </Field>
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
