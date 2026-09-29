export type CompanyFormValues = {
  name: string;
  legalName: string;
  taxId: string;
  website: string;
  email: string;
  phone: string;
  phoneCountry: string;
  province: string;
  city: string;
  address: string;
  tags: string;
};

export type CompanyFormState = {
  feedback: { tone: "success" | "error"; message: string } | null;
  fieldErrors: Partial<Record<keyof CompanyFormValues, string>>;
  values: CompanyFormValues;
  saved?: boolean;
  companyId?: string;
};

export const emptyCompanyValues: CompanyFormValues = {
  name: "",
  legalName: "",
  taxId: "",
  website: "",
  email: "",
  phone: "",
  phoneCountry: "EC",
  province: "",
  city: "",
  address: "",
  tags: "",
};
