import type { ActivityStatus, ActivityType, DocumentType } from "@wave/shared";
import type { JourneyDeal } from "../pipeline/types";

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
  documentType: DocumentType;
  documentId: string;
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
  deals: JourneyDeal[];
  activities: Array<{
    id: string;
    type: ActivityType;
    status: ActivityStatus;
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
