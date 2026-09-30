export type Company = {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  tags: string[];
  owner: { id: string; name: string } | null;
  _count: { contacts: number };
  createdAt: string;
  updatedAt: string;
};

export type CompanyDetail = Company & {
  contacts: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    position: string | null;
    tags: string[];
  }>;
  deals: Array<{
    id: string;
    title: string;
    value: string;
    currency: string;
    status: "OPEN" | "WON" | "LOST";
    expectedClose: string | null;
    stage: { id: string; name: string; color: string | null };
  }>;
  history: Array<{
    id: string;
    action: string;
    changes: { fields?: string[] } | null;
    createdAt: string;
    user: { id: string; name: string } | null;
  }>;
};

export type CompanyList = {
  data: Company[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
