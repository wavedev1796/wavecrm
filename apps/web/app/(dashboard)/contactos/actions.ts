"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { apiError, authenticatedApi } from "@/lib/authenticated-api";
import {
  cedulaError,
  normalizeDigits,
  phoneError,
  provinceError,
  rucError,
} from "@/lib/ecuador";
import {
  fieldErrors,
  formText,
  nameError,
  normalizeEmail,
  normalizeName,
} from "@/lib/validation";
import type { ContactFormState, ContactFormValues } from "./contact-form-state";

export async function saveContact(
  _state: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const id = formText(formData, "id");
  const values = readValues(formData);
  const invalid = fieldErrors({
    firstName: nameError(values.firstName),
    lastName: nameError(values.lastName, "apellido"),
    email: contactEmailError(values.email),
    phone: phoneError(values.phone),
    documentId: cedulaError(values.documentId),
    province: provinceError(values.province),
    city: optionalLengthError(values.city, "La ciudad", 2, 60),
    position:
      values.position.length > 100
        ? "El cargo no puede superar 100 caracteres."
        : null,
    tags: tagsError(values.tags),
    companyTaxId: rucError(values.companyTaxId),
  });
  if (invalid) return { feedback: null, fieldErrors: invalid, values };

  try {
    const company = await companyForRuc(values.companyTaxId);
    if (values.companyTaxId && !company) {
      return {
        feedback: null,
        fieldErrors: { companyTaxId: "No existe una empresa con ese RUC." },
        values,
      };
    }
    const body = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      documentId: values.documentId,
      province: values.province,
      city: values.city,
      position: values.position,
      tags: tags(values.tags),
      companyId: company?.id ?? null,
    };
    const response = await authenticatedApi(
      id ? `/contacts/${encodeURIComponent(id)}` : "/contacts",
      { method: id ? "PATCH" : "POST", body: JSON.stringify(body) },
    );
    if (!response.ok) {
      return {
        feedback: { tone: "error", message: await apiError(response) },
        fieldErrors: {},
        values,
      };
    }
    const saved = (await response.json()) as { id: string };
    revalidatePath("/contactos");
    revalidatePath(`/contactos/${saved.id}`);
    return {
      feedback: {
        tone: "success",
        message: id ? "Contacto actualizado." : "Contacto creado.",
      },
      fieldErrors: {},
      values,
      contactId: saved.id,
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      feedback: {
        tone: "error",
        message: "No pudimos conectar con el servidor. Inténtalo de nuevo.",
      },
      fieldErrors: {},
      values,
    };
  }
}

function readValues(formData: FormData): ContactFormValues {
  return {
    firstName: normalizeName(formText(formData, "firstName")),
    lastName: normalizeName(formText(formData, "lastName")),
    email: normalizeEmail(formText(formData, "email")),
    phone: formText(formData, "phone").trim(),
    documentId: normalizeDigits(formText(formData, "documentId")),
    province: formText(formData, "province").trim(),
    city: normalizeName(formText(formData, "city")),
    position: normalizeName(formText(formData, "position")),
    tags: formText(formData, "tags").trim(),
    companyTaxId: normalizeDigits(formText(formData, "companyTaxId")),
  };
}

async function companyForRuc(taxId: string) {
  if (!taxId) return null;
  const response = await authenticatedApi(
    `/companies?search=${encodeURIComponent(taxId)}&limit=2`,
  );
  if (!response.ok) return null;
  const result = (await response.json()) as {
    data: Array<{ id: string; taxId: string | null }>;
  };
  return result.data.find((company) => company.taxId === taxId) ?? null;
}

function tags(value: string) {
  return [
    ...new Set(
      value
        .split(/[,;]/)
        .map((tag) => normalizeName(tag).toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function tagsError(value: string) {
  const list = tags(value);
  if (list.length > 10) return "Puedes asignar hasta 10 etiquetas.";
  if (list.some((tag) => tag.length < 2 || tag.length > 30)) {
    return "Cada etiqueta debe tener entre 2 y 30 caracteres.";
  }
  return list.some((tag) => !/^[\p{L}\p{N}][\p{L}\p{N} -]*$/u.test(tag))
    ? "Las etiquetas solo pueden tener letras, números, espacios y guiones."
    : null;
}

function contactEmailError(value: string) {
  if (!value) return null;
  if (value.length > 64) return "El correo no puede superar 64 caracteres.";
  return /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(
    value,
  )
    ? null
    : "Escribe un correo válido, por ejemplo nombre@empresa.ec.";
}

function optionalLengthError(
  value: string,
  label: string,
  min: number,
  max: number,
) {
  return !value || (value.length >= min && value.length <= max)
    ? null
    : `${label} debe tener entre ${min} y ${max} caracteres.`;
}
