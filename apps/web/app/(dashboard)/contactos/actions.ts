"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { apiError, authenticatedApi } from "@/lib/authenticated-api";
import { cantonError } from "@/lib/cantons";
import { documentError, normalizeDocument, provinceError } from "@/lib/ecuador";
import { countryOrEcuador, normalizePhone, phoneError } from "@/lib/phone";
import {
  fieldErrors,
  formText,
  nameError,
  normalizeEmail,
  normalizeName,
  optionalEmailError,
  parseTags,
  tagsError,
} from "@/lib/validation";
import {
  companyLabel,
  type CompanyOption,
  type ContactFormState,
  type ContactFormValues,
} from "./contact-form-state";

export async function saveContact(
  _state: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const id = formText(formData, "id");
  const values = readValues(formData);
  const country = countryOrEcuador(values.phoneCountry);
  const invalid = fieldErrors({
    firstName: nameError(values.firstName),
    lastName: nameError(values.lastName, "apellido"),
    documentId: documentError(values.documentType, values.documentId),
    company:
      values.company && !values.companyId
        ? "Elige una empresa de la lista o deja el campo vacío."
        : null,
    email: optionalEmailError(values.email),
    phone: phoneError(values.phone, country),
    province: provinceError(values.province),
    city: cantonError(values.province, values.city),
    position:
      values.position.length > 100
        ? "El cargo no puede superar 100 caracteres."
        : null,
    tags: tagsError(values.tags),
  });
  if (invalid) return { feedback: null, fieldErrors: invalid, values };

  try {
    const body = {
      firstName: values.firstName,
      lastName: values.lastName,
      documentType: values.documentType,
      documentId: values.documentId,
      email: values.email,
      // Ya validado: el API recibe E.164 porque sin "+" asumiría Ecuador. Vacío borra el teléfono.
      phone: normalizePhone(values.phone, country) ?? "",
      province: values.province,
      city: values.city,
      position: values.position,
      tags: parseTags(values.tags),
      companyId: values.companyId || null,
    };
    const response = await authenticatedApi(
      id ? `/contacts/${encodeURIComponent(id)}` : "/contacts",
      { method: id ? "PATCH" : "POST", body: JSON.stringify(body) },
    );
    if (response.status === 409) {
      // El único conflicto de un contacto es su documento: se muestra junto al campo.
      return {
        feedback: null,
        fieldErrors: { documentId: await apiError(response) },
        values,
      };
    }
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

/** Empresas registradas por nombre o RUC para el campo "Empresa donde trabaja". */
export async function searchCompanies(term: string): Promise<CompanyOption[]> {
  const search = term.trim().slice(0, 100);
  if (!search) return [];
  try {
    const response = await authenticatedApi(
      `/companies?search=${encodeURIComponent(search)}&limit=8`,
    );
    if (!response.ok) return [];
    const { data } = (await response.json()) as {
      data: Array<{ id: string; name: string; taxId: string | null }>;
    };
    return data.map((company) => ({
      id: company.id,
      label: companyLabel(company),
      taxId: company.taxId,
    }));
  } catch (error) {
    unstable_rethrow(error);
    return [];
  }
}

function readValues(formData: FormData): ContactFormValues {
  const documentType = formText(formData, "documentType").trim();
  return {
    firstName: normalizeName(formText(formData, "firstName")),
    lastName: normalizeName(formText(formData, "lastName")),
    documentType,
    documentId: normalizeDocument(
      documentType,
      formText(formData, "documentId"),
    ),
    company: normalizeName(formText(formData, "company")),
    companyId: formText(formData, "companyId").trim(),
    email: normalizeEmail(formText(formData, "email")),
    phone: formText(formData, "phone").trim(),
    phoneCountry: countryOrEcuador(formText(formData, "phoneCountry")),
    province: formText(formData, "province").trim(),
    city: normalizeName(formText(formData, "city")),
    position: normalizeName(formText(formData, "position")),
    tags: formText(formData, "tags").trim(),
  };
}
