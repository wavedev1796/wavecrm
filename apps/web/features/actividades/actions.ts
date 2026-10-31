"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { authenticatedApi, apiError } from "@/lib/authenticated-api";

export type ActivityActionState = { ok: boolean; message: string };

export async function saveActivity(
  _state: ActivityActionState,
  formData: FormData,
): Promise<ActivityActionState> {
  const id = String(formData.get("id") ?? "");
  const dueAt = asEcuadorIso(formData.get("dueAt"));
  const reminderAt = asEcuadorIso(formData.get("reminderAt"));
  const body = {
    type: String(formData.get("type") ?? "TASK"),
    subject: String(formData.get("subject") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
    ...(dueAt ? { dueAt } : id ? { dueAt: null } : {}),
    ...(reminderAt ? { reminderAt } : id ? { reminderAt: null } : {}),
    assigneeId: String(formData.get("assigneeId") ?? ""),
  };
  try {
    const response = await authenticatedApi(
      id ? `/activities/${encodeURIComponent(id)}` : "/activities",
      {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) return { ok: false, message: await apiError(response) };
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

function asEcuadorIso(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return undefined;
  const parsed = new Date(`${value}:00-05:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
