export type CompanyFormValues = {
  name: string;
  legalName: string;
  taxId: string;
  email: string;
  phone: string;
  phoneCountry: string;
  province: string;
  city: string;
  tags: string;
};

export type CompanyFormState = {
  feedback: { tone: "error"; message: string } | null;
  fieldErrors: Partial<Record<keyof CompanyFormValues, string>>;
  values: CompanyFormValues;
  saved?: boolean;
};

export const emptyCompanyValues: CompanyFormValues = {
  name: "",
  legalName: "",
  taxId: "",
  email: "",
  phone: "",
  phoneCountry: "EC",
  province: "",
  city: "",
  tags: "",
};
