import { parseAmount } from "@wave/shared";
import { NEGOCIO, PIPELINE } from "@/content/pipeline";
import type {
  DealFormState,
  DealValues,
  ItemErrors,
  ItemValues,
} from "./types";

/** Fecha AAAA-MM-DD que existe en el calendario (31 de febrero no). */
export function isDay(value: string) {
  const date = new Date(value + "T00:00:00.000Z");
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}
/** Hoy en Ecuador como AAAA-MM-DD (UTC-5, sin horario de verano), igual que ecuadorToday() del API. */
export const todayEcuador = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date());
/** Monto hasta 999.999.999.999,99 (el máximo de Decimal(14,2)): punto de miles opcional y coma para los centavos. */
export const isAmount = (value: string) => parseAmount(value) !== null;

export function validateDeal(values: DealValues): DealFormState["fieldErrors"] {
  const errors: DealFormState["fieldErrors"] = {};
  if (values.title.length < 2 || values.title.length > 160)
    errors.title = PIPELINE.titleRequired;
  if (!isAmount(values.value)) errors.value = PIPELINE.amountInvalid;
  if (!values.pipelineId) errors.pipelineId = "Elige un pipeline.";
  if (!values.stageId) errors.stageId = "Elige una etapa.";
  if (!values.contactId && !values.companyId)
    errors.contactId = PIPELINE.linked;
  if (values.expectedClose && !isDay(values.expectedClose))
    errors.expectedClose = PIPELINE.dateInvalid;
  return errors;
}

/** Mismas reglas que DealItemDto del API, para marcar cada celda antes de enviar. */
export function validateItems(rows: readonly ItemValues[]): ItemErrors | null {
  const errors: ItemErrors = {};
  const texto = NEGOCIO.productos.errores;
  rows.forEach((row, index) => {
    const description = row.description.trim();
    const quantity = parseAmount(row.quantity, 6);
    const rowErrors: ItemErrors[number] = {};
    if (description.length < 2 || description.length > 200)
      rowErrors.description = texto.descripcion;
    if (!quantity)
      rowErrors.quantity = texto.cantidad;
    if (!isAmount(row.unitPrice)) rowErrors.unitPrice = texto.precio;
    if (!/^\d{1,3}$/.test(row.taxRate.trim()) || Number(row.taxRate) > 100)
      rowErrors.taxRate = texto.iva;
    if (Object.keys(rowErrors).length) errors[index] = rowErrors;
  });
  return Object.keys(errors).length ? errors : null;
}
