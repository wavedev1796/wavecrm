export type Company = {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  province: string | null;
  tags: string[];
  owner: { id: string; name: string } | null;
  _count: { contacts: number };
};

export type CompanyList = {
  data: Company[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
