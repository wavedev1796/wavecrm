import { expect, test, vi } from "vitest";
import { cancelActivity, completeActivity, saveActivity } from "./actions";

const mocks = vi.hoisted(() => ({
  authenticatedApi: vi.fn(),
  apiError: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_rethrow: vi.fn(),
}));
vi.mock("@/lib/authenticated-api", () => ({
  authenticatedApi: mocks.authenticatedApi,
  apiError: mocks.apiError,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  unstable_rethrow: mocks.unstable_rethrow,
}));

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

test("crear actividad convierte fechas locales de Ecuador y revalida las fichas afectadas", async () => {
  mocks.authenticatedApi.mockResolvedValue({ ok: true });
  const result = await saveActivity(
    { ok: false, message: "" },
    form({
      subject: "Llamar al cliente",
      type: "CALL",
      assigneeId: "user-1",
      dueAt: "2026-11-03T09:30",
      reminderAt: "2026-11-03T09:00",
    }),
  );
  expect(result).toEqual({ ok: true, message: "Actividad creada." });
  expect(mocks.authenticatedApi).toHaveBeenCalledWith(
    "/activities",
    expect.objectContaining({ method: "POST" }),
  );
  const payload = JSON.parse(
    mocks.authenticatedApi.mock.calls[0]?.[1]?.body ?? "{}",
  );
  expect(payload.dueAt).toBe("2026-11-03T14:30:00.000Z");
  expect(payload.reminderAt).toBe("2026-11-03T14:00:00.000Z");
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/actividades");
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/pipeline");
});

test("editar envía la versión leída y permite limpiar vencimiento y recordatorio", async () => {
  mocks.authenticatedApi.mockResolvedValue({ ok: true });
  await saveActivity(
    { ok: false, message: "" },
    form({
      id: "activity-1",
      updatedAt: "2026-11-03T12:00:00.000Z",
      subject: "Llamar",
      type: "CALL",
      assigneeId: "user-1",
    }),
  );
  const payload = JSON.parse(
    mocks.authenticatedApi.mock.calls.at(-1)?.[1]?.body ?? "{}",
  );
  expect(payload.dueAt).toBeNull();
  expect(payload.reminderAt).toBeNull();
  expect(payload.updatedAt).toBe("2026-11-03T12:00:00.000Z");
});

test("cancelar usa el endpoint de transición y revalida agenda y fichas", async () => {
  mocks.authenticatedApi.mockResolvedValue({ ok: true });
  expect(await cancelActivity("activity-1")).toEqual({ ok: true, message: "Actividad cancelada." });
  expect(mocks.authenticatedApi).toHaveBeenCalledWith("/activities/activity-1/cancel", { method: "PATCH" });
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/actividades");
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/pipeline");
});

test("editar identifica los 409 para que la agenda se recargue", async () => {
  mocks.authenticatedApi.mockResolvedValue({ ok: false, status: 409 });
  mocks.apiError.mockResolvedValue("La actividad cambió desde que la abriste.");
  const result = await saveActivity({ ok: false, message: "" }, form({
    id: "activity-1",
    updatedAt: "2026-11-03T12:00:00.000Z",
    subject: "Llamar",
    type: "CALL",
    assigneeId: "user-1",
  }));
  expect(result).toMatchObject({ ok: false, conflict: true });
});

test("marcar como hecha usa el endpoint de transición y muestra el error del API", async () => {
  mocks.authenticatedApi.mockResolvedValueOnce({ ok: false });
  mocks.apiError.mockResolvedValue("La actividad ya no está pendiente.");
  expect(await completeActivity("activity-1")).toEqual({
    ok: false,
    message: "La actividad ya no está pendiente.",
  });
  expect(mocks.authenticatedApi).toHaveBeenCalledWith(
    "/activities/activity-1/complete",
    { method: "PATCH" },
  );
});
