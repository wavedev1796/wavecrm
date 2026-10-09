import { PIPELINE } from "@/content/pipeline";
import type { DealFormState, DealValues } from "./types";
export function validateDeal(values: DealValues): DealFormState["fieldErrors"] {
  const errors: DealFormState["fieldErrors"] = {};
  if (values.title.length < 2 || values.title.length > 160)
    errors.title = PIPELINE.titleRequired;
  if (
    !/^\d{1,12}(\.\d{1,2})?$/.test(values.value) ||
    Number(values.value) > 999999999999.99
  )
    errors.value = PIPELINE.amountInvalid;
  if (!values.pipelineId) errors.pipelineId = "Elige un pipeline.";
  if (!values.stageId) errors.stageId = "Elige una etapa.";
  if (!values.contactId && !values.companyId)
    errors.contactId = PIPELINE.linked;
  if (values.expectedClose) {
    const date = new Date(values.expectedClose + "T00:00:00.000Z");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(values.expectedClose) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== values.expectedClose
    )
      errors.expectedClose = PIPELINE.dateInvalid;
  }
  if (values.status && !["OPEN", "WON", "LOST"].includes(values.status))
    errors.status = "Elige un estado valido.";
  return errors;
}
