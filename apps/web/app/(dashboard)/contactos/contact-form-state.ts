export type ContactFormValues = {
  firstName: string;
  lastName: string;
  documentType: string;
  documentId: string;
  /** Texto del campo "Empresa donde trabaja"; `companyId` es la empresa elegida. */
  company: string;
  companyId: string;
  email: string;
  phone: string;
  phoneCountry: string;
  province: string;
  city: string;
  position: string;
  tags: string;
};

export type ContactFormState = {
  feedback: { tone: "success" | "error"; message: string } | null;
  fieldErrors: Partial<Record<keyof ContactFormValues, string>>;
  values: ContactFormValues;
  contactId?: string;
};

export const emptyContactValues: ContactFormValues = {
  firstName: "",
  lastName: "",
  documentType: "",
  documentId: "",
  company: "",
  companyId: "",
  email: "",
  phone: "",
  phoneCountry: "EC",
  province: "",
  city: "",
  position: "",
  tags: "",
};

export type CompanyOption = { id: string; label: string; taxId: string | null };

/** `Comercial Andina · 1791234561001`, o solo el nombre si la empresa no tiene RUC. */
export const companyLabel = (company: {
  name: string;
  taxId: string | null;
}) => (company.taxId ? `${company.name} · ${company.taxId}` : company.name);
