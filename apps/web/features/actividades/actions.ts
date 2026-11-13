"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { authenticatedApi, apiError } from "@/lib/authenticated-api";
import type { ActivityType } from "@wave/shared";
import { ecuadorIso } from "./dates";

export type ActivityActionState = { ok: boolean; message: string; conflict?: boolean };
export type ActivityHistoryAction = "CREATED" | "UPDATED" | "COMPLETED" | "CANCELLED" | "DELETED";
export type ActivityHistoryRecord = {
  id: string;
  kind: ActivityHistoryAction;
  activityId: string;
  subject: string;
  activityType: ActivityType | null;
  at: string;
  author: { id: string; name: string } | null;
  changes: Record<string, unknown> | null;
};
export type ActivityHistoryResult =
  | { data: ActivityHistoryRecord[]; nextCursor: string | null }
  | { error: string };

export async function loadActivityHistory(
  action?: ActivityHistoryAction,
  cursor?: string,
): Promise<ActivityHistoryResult> {
  const query = new URLSearchParams({ limit: "20" });
  if (action) query.set("action", action);
  if (cursor) query.set("cursor", cursor);
  try {
    const response = await authenticatedApi(`/activities/history?${query}`);
    if (!response.ok) return { error: await apiError(response) };
    const page = (await response.json()) as {
      data: ActivityHistoryRecord[];
      meta: { nextCursor: string | null };
    };
    return { data: page.data, nextCursor: page.meta.nextCursor };
  } catch (error) {
    unstable_rethrow(error);
    return { error: "No pudimos cargar el historial de actividades." };
  }
}

export async function saveActivity(
  _state: ActivityActionState,
  formData: FormData,
): Promise<ActivityActionState> {
  const id = String(formData.get("id") ?? "");
  const dueAt = ecuadorIso(formData.get("dueAt"));
  const reminderAt = ecuadorIso(formData.get("reminderAt"));
  const updatedAt = String(formData.get("updatedAt") ?? "");
  const body = {
    type: String(formData.get("type") ?? "TASK"),
    subject: String(formData.get("subject") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
    ...(dueAt ? { dueAt } : id ? { dueAt: null } : {}),
    ...(reminderAt ? { reminderAt } : id ? { reminderAt: null } : {}),
    assigneeId: String(formData.get("assigneeId") ?? ""),
    ...(id && updatedAt && { updatedAt }),
  };
  try {
    const response = await authenticatedApi(
      id ? `/activities/${encodeURIComponent(id)}` : "/activities",
      {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      },
    );
    if (!response.ok)
      return {
        ok: false,
        message: await apiError(response),
        conflict: response.status === 409,
      };
    revalidatePath("/actividades");
    revalidatePath("/pipeline");
    return {
      ok: true,
      message: id ? "Actividad actualizada." : "Actividad creada.",
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false,
      message: "No pudimos guardar la actividad. Intenta otra vez.",
    };
  }
}

export async function saveActivityForm(formData: FormData): Promise<void> {
  await saveActivity({ ok: false, message: "" }, formData);
}

export async function completeActivity(
  id: string,
): Promise<ActivityActionState> {
  return mutate(
    `/activities/${encodeURIComponent(id)}/complete`,
    "PATCH",
    "Actividad marcada como hecha.",
  );
}

export async function cancelActivity(id: string): Promise<ActivityActionState> {
  return mutate(
    `/activities/${encodeURIComponent(id)}/cancel`,
    "PATCH",
    "Actividad cancelada.",
  );
}

export async function deleteActivity(id: string): Promise<ActivityActionState> {
  return mutate(
    `/activities/${encodeURIComponent(id)}`,
    "DELETE",
    "Actividad eliminada.",
  );
}

async function mutate(
  path: string,
  method: string,
  success: string,
): Promise<ActivityActionState> {
  try {
    const response = await authenticatedApi(path, { method });
    if (!response.ok) return { ok: false, message: await apiError(response) };
    revalidatePath("/actividades");
    revalidatePath("/pipeline");
    return { ok: true, message: success };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, message: "No pudimos completar la operación." };
  }
}

