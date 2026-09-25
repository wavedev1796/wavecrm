export type ContactCompany = {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
};

export type ContactOwner = { id: string; name: string; email: string };

export type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  documentId: string | null;
  province: string | null;
  city: string | null;
  position: string | null;
  tags: string[];
  company: ContactCompany | null;
  owner: ContactOwner | null;
  createdAt: string;
  updatedAt: string;
};

export type ContactDetail = Contact & {
  deals: Array<{
    id: string;
    title: string;
    value: string;
    currency: string;
    status: "OPEN" | "WON" | "LOST";
    expectedClose: string | null;
    stage: { id: string; name: string; color: string | null };
  }>;
  activities: Array<{
    id: string;
    type: "CALL" | "EMAIL" | "MEETING" | "TASK";
    status: "PENDING" | "COMPLETED" | "CANCELLED";
    subject: string;
    description: string | null;
    dueAt: string | null;
    completedAt: string | null;
    assignee: { id: string; name: string } | null;
  }>;
};

export type ContactList = {
  data: Contact[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
