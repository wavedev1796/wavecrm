import type {
  ActivityStatus,
  ActivityType,
  DealStatus,
  LossReason,
  QuoteStatus,
  StageRequirement,
  TransitionCheck,
} from "@wave/shared";

export type Option = { id: string; name: string };
export type Deal = {
  id: string;
  title: string;
  value: string | number;
  currency: string;
  status: DealStatus;
  pipelineId: string;
  stageId: string;
  contactId: string | null;
  companyId: string | null;
  ownerId: string | null;
  expectedClose: string | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  company: Option | null;
  owner: Option | null;
  _count?: { items: number };
};
export type Stage = {
  id: string;
  name: string;
  color: string | null;
  position: number;
  probability: number;
  requirements?: StageRequirement[];
  count: number;
  value: string | number;
  deals: Deal[];
};
/** Columna del tablero: cantidad y valor de todos sus negocios, con la primera página de tarjetas. */
export type Column = { count: number; value: string | number; deals: Deal[] };
export type Metrics = Record<"open" | "won" | "lost", { count: number; value: string }>;
/** Lo que falta para un cambio de etapa (códigos de @wave/shared, mensaje del API). */
export type Pending = { code: TransitionCheck; message: string };
export type Preview = {
  pending: Pending[];
  quote: { id: string; number: string; status: QuoteStatus } | null;
  items: number;
};
export type Pipeline = {
  id: string;
  name: string;
  isDefault: boolean;
  stages: Stage[];
};
export type Board = {
  pipeline: Omit<Pipeline, "stages">;
  stages: Stage[];
  lost: Column;
  metrics: Metrics;
};
export type HistoryItem = {
  id: string;
  changedAt: string;
  fromStage: Option | null;
  toStage: Option;
  changedBy: Option | null;
  reason?: string | null;
};
export type DealValues = Record<
  | "title"
  | "value"
  | "pipelineId"
  | "stageId"
  | "contactId"
  | "companyId"
  | "ownerId"
  | "expectedClose",
  string
>;
export type DealFormState = {
  values: DealValues;
  fieldErrors: Partial<Record<keyof DealValues, string>>;
  feedback?: { tone: "error" | "success"; message: string };
  savedId?: string;
};
export const emptyDeal: DealValues = {
  title: "",
  value: "",
  pipelineId: "",
  stageId: "",
  contactId: "",
  companyId: "",
  ownerId: "",
  expectedClose: "",
};

export type DealItem = {
  id: string;
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  taxRate: number;
};
export type Activity = {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  subject: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  assignee: Option | null;
};
export type Quote = {
  id: string;
  number: string;
  status: QuoteStatus;
  subtotal: string;
  tax: string;
  total: string;
  createdAt: string;
  sentAt?: string | null;
  validUntil?: string | null;
  acceptedAt?: string | null;
  acceptanceNote?: string | null;
};
export type Closure = {
  id: string;
  action: "WON" | "LOST" | "REOPENED";
  changes: {
    quoteNumber?: string;
    lossReason?: LossReason;
    lossDetail?: string | null;
    from?: DealStatus;
    reason?: string | null;
  } | null;
  createdAt: string;
  user: Option | null;
};
export type DealDetail = Omit<Deal, "contact" | "company"> & {
  closedAt: string | null;
  lossReason: LossReason | null;
  lossDetail: string | null;
  need?: string | null;
  solution?: string | null;
  budget?: string | null;
  budgetNote?: string | null;
  decisionMaker?: string | null;
  createdAt: string;
  pipeline: Option;
  stage: { id: string; name: string; color: string | null; probability: number };
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  company: (Option & { taxId: string | null; email: string | null; phone: string | null }) | null;
  items: DealItem[];
  quotes: Quote[];
  activities: Activity[];
  stageHistory: HistoryItem[];
  closures: Closure[];
};
export type ItemValues = {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
};
export type ItemErrors = Record<
  number,
  Partial<Record<"description" | "quantity" | "unitPrice" | "taxRate", string>>
>;
export type ActivityValues = Record<"type" | "subject" | "dueAt" | "description" | "done", string>;
export type ActivityFormState = {
  values: ActivityValues;
  fieldErrors: Partial<Record<keyof ActivityValues, string>>;
  feedback?: { tone: "error" | "success"; message: string };
};
export const emptyActivity: ActivityValues = {
  type: "CALL",
  subject: "",
  dueAt: "",
  description: "",
  done: "",
};
