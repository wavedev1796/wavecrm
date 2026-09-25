export type ContactFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentId: string;
  province: string;
  city: string;
  position: string;
  tags: string;
  companyTaxId: string;
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
  email: "",
  phone: "",
  documentId: "",
  province: "",
  city: "",
  position: "",
  tags: "",
  companyTaxId: "",
};
