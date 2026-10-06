"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { COMUN } from "@/content/comun";
import { EMPRESAS } from "@/content/empresas";
import { apiError, authenticatedApi } from "@/lib/authenticated-api";
import { cantonError } from "@/lib/cantons";
import { normalizeDigits, provinceError, rucError } from "@/lib/ecuador";
import { countryOrEcuador, normalizePhone, phoneError } from "@/lib/phone";
import {
  companyNameError,
  fieldErrors,
  formText,
  normalizeEmail,
  normalizeName,
  optionalEmailError,
  optionalLengthError,
  parseTags,
  tagsError,
  websiteError,
} from "@/lib/validation";
import type { CompanyFormState, CompanyFormValues } from "./company-form-state";

export async function saveCompany(
  _state: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const id = formText(formData, "id");
  const values = readValues(formData);
  const country = countryOrEcuador(values.phoneCountry);
  const invalid = fieldErrors({
    name: companyNameError(values.name, { required: true }),
    legalName: companyNameError(values.legalName, { required: false }),
    taxId: values.taxId ? rucError(values.taxId) : EMPRESAS.formulario.errores.ruc,
    website: websiteError(values.website),
    email: optionalEmailError(values.email),
    phone: phoneError(values.phone, country),
    province: provinceError(values.province),
    city: cantonError(values.province, values.city),
    address: optionalLengthError(
      values.address,
      EMPRESAS.formulario.errores.direccion,
      1,
      200,
    ),
    tags: tagsError(values.tags),
  });
  if (invalid) return { feedback: null, fieldErrors: invalid, values };

  try {
    const response = await authenticatedApi(
      id ? `/companies/${encodeURIComponent(id)}` : "/companies",
      {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify({
        name: values.name,
        legalName: values.legalName || null,
        taxId: values.taxId,
        website: values.website || null,
        email: values.email || null,
        phone: normalizePhone(values.phone, country),
        province: values.province || null,
        city: values.city || null,
        address: values.address || null,
        tags: parseTags(values.tags),
      }),
      },
    );
    if (response.status === 409) {
      // El único conflicto de una empresa es su RUC: se muestra junto al campo.
      return {
        feedback: null,
        fieldErrors: { taxId: await apiError(response) },
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
    revalidatePath("/empresas");
    revalidatePath(`/empresas/${saved.id}`);
    return {
      feedback: {
        tone: "success",
        message: id
          ? EMPRESAS.formulario.actualizada
          : EMPRESAS.formulario.creada,
      },
      fieldErrors: {},
      values,
      saved: true,
      companyId: saved.id,
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      feedback: {
        tone: "error",
        message: COMUN.errores.conexion,
      },
      fieldErrors: {},
      values,
    };
  }
}

function readValues(formData: FormData): CompanyFormValues {
  return {
    name: normalizeName(formText(formData, "name")),
    legalName: normalizeName(formText(formData, "legalName")),
    taxId: normalizeDigits(formText(formData, "taxId")),
    website: formText(formData, "website").trim(),
    email: normalizeEmail(formText(formData, "email")),
    phone: formText(formData, "phone").trim(),
    phoneCountry: countryOrEcuador(formText(formData, "phoneCountry")),
    province: formText(formData, "province").trim(),
    city: normalizeName(formText(formData, "city")),
    address: normalizeName(formText(formData, "address")),
    tags: formText(formData, "tags").trim(),
  };
}
