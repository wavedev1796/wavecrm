"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { authenticatedApi, apiError } from "@/lib/authenticated-api";
import { PIPELINE } from "@/content/pipeline";
import { validateDeal } from "./deal-validation";
import {
  emptyDeal,
  type DealFormState,
  type DealValues,
  type HistoryItem,
} from "./types";

function refresh() {
  for (const path of ["/pipeline", "/contactos", "/empresas"])
    revalidatePath(path, "layout");
}
function formText(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}
async function request(
  path: string,
  method: string,
  body?: unknown,
): Promise<{ error?: string; data?: unknown }> {
  try {
    const response = await authenticatedApi(path, {
      method,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    if (!response.ok) return { error: await apiError(response) };
    const data: unknown =
      response.status === 204
        ? undefined
        : await response.json().catch(() => undefined);
    if (method !== "GET") refresh();
    return { data };
  } catch (error) {
    unstable_rethrow(error);
    return { error: PIPELINE.connection };
  }
}
export async function saveDeal(
  _state: DealFormState,
  form: FormData,
): Promise<DealFormState> {
  const values = { ...emptyDeal };
  for (const key of Object.keys(values) as (keyof DealValues)[]) {
    const value = form.get(key);
    values[key] = typeof value === "string" ? value.trim() : "";
  }
  values.value = values.value.replace(",", ".");
  const fieldErrors = validateDeal(values);
  if (Object.keys(fieldErrors).length) return { values, fieldErrors };
  const id = formText(form, "id");
  const result = await request(
    id ? "/deals/" + encodeURIComponent(id) : "/deals",
    id ? "PATCH" : "POST",
    {
      title: values.title,
      value: Number(values.value),
      pipelineId: values.pipelineId,
      stageId: values.stageId,
      contactId: values.contactId || null,
      companyId: values.companyId || null,
      ...(values.ownerId && { ownerId: values.ownerId }),
      expectedClose: values.expectedClose
        ? values.expectedClose + "T00:00:00.000Z"
        : null,
      ...(values.status && { status: values.status }),
    },
  );
  if (result.error)
    return {
      values,
      fieldErrors: {},
      feedback: { tone: "error", message: result.error },
    };
  const saved = result.data as { id: string };
  return {
    values,
    fieldErrors: {},
    savedId: saved.id,
    feedback: {
      tone: "success",
      message: id ? PIPELINE.updated : PIPELINE.created,
    },
  };
}
export async function moveDealAction(dealId: string, stageId: string) {
  return request("/deals/" + encodeURIComponent(dealId) + "/move", "PATCH", {
    stageId,
  });
}
export async function deleteDealAction(dealId: string) {
  return request("/deals/" + encodeURIComponent(dealId), "DELETE");
}
export async function dealHistoryAction(
  id: string,
): Promise<{ error?: string; data?: HistoryItem[] }> {
  const result = await request(
    "/deals/" + encodeURIComponent(id) + "/history",
    "GET",
  );
  return {
    error: result.error,
    data: result.data as HistoryItem[] | undefined,
  };
}
type ConfigurationOperation =
  | "createPipeline"
  | "updatePipeline"
  | "deletePipeline"
  | "createStage"
  | "updateStage"
  | "deleteStage";

function configurationRoute(operation: ConfigurationOperation, id: string) {
  const encoded = encodeURIComponent(id);
  if (operation === "createPipeline") return "/pipelines";
  if (operation === "createStage") return "/pipelines/" + encoded + "/stages";
  const resource = operation.endsWith("Stage") ? "/stages/" : "/pipelines/";
  return resource + encoded;
}

export async function configurePipelineAction(
  operation: ConfigurationOperation,
  id: string,
  form: FormData,
) {
  const route = configurationRoute(operation, id);
  if (operation.startsWith("delete")) return request(route, "DELETE");
  const name = formText(form, "name");
  if (name.length < 2)
    return { error: "Ingresa un nombre de al menos dos caracteres." };
  const stage = operation.endsWith("Stage");
  const body = stage
    ? {
        name,
        position: Number(formText(form, "position")),
        probability: Number(formText(form, "probability")),
        color: formText(form, "color") || "#2f6f8f",
      }
    : { name, ...(form.get("isDefault") === "true" && { isDefault: true }) };
  if (
    stage &&
    (!Number.isInteger(body.position) || !Number.isInteger(body.probability))
  )
    return { error: "La posicion y la probabilidad deben ser enteros." };
  const method = operation.startsWith("create") ? "POST" : "PATCH";
  return request(route, method, body);
}
