export type Option = { id: string; name: string };
export type Deal = {
  id: string;
  title: string;
  value: string | number;
  currency: string;
  status: "OPEN" | "WON" | "LOST";
  pipelineId: string;
  stageId: string;
  contactId: string | null;
  companyId: string | null;
  ownerId: string | null;
  expectedClose: string | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  company: Option | null;
  owner: Option | null;
};
export type Stage = {
  id: string;
  name: string;
  color: string | null;
  position: number;
  probability: number;
  count: number;
  value: string | number;
  deals: Deal[];
};
export type Pipeline = {
  id: string;
  name: string;
  isDefault: boolean;
  stages: Stage[];
};
export type Board = { pipeline: Omit<Pipeline, "stages">; stages: Stage[] };
export type HistoryItem = {
  id: string;
  changedAt: string;
  fromStage: Option | null;
  toStage: Option;
  changedBy: Option | null;
};
export type DealValues = Record<
  | "title"
  | "value"
  | "pipelineId"
  | "stageId"
  | "contactId"
  | "companyId"
  | "ownerId"
  | "expectedClose"
  | "status",
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
  status: "",
};
export const STATUS_LABEL = {
  OPEN: "Abierto",
  WON: "Ganado",
  LOST: "Perdido",
} as const;
