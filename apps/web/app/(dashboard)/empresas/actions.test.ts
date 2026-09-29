import { revalidatePath } from "next/cache";
import { beforeEach, expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import { saveCompany } from "./actions";
import {
  emptyCompanyValues,
  type CompanyFormState,
} from "./company-form-state";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/lib/authenticated-api", () => ({
  authenticatedApi: vi.fn(),
  apiError: async (response: Response) =>
    ((await response.json()) as { error: { message: string } }).error.message,
}));
const api = vi.mocked(authenticatedApi);
const empty: CompanyFormState = {
  feedback: null,
  fieldErrors: {},
  values: emptyCompanyValues,
};
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => vi.clearAllMocks());

test("CRM-15: nombre y RUC son obligatorios y se validan antes de llamar al API", async () => {
  const result = await saveCompany(
    empty,
    form({ name: "", taxId: "", phone: "123" }),
  );
  expect(result.fieldErrors).toEqual({
    name: "Ingresa el nombre.",
    taxId: "Ingresa el RUC.",
    phone:
      "Escribe un teléfono válido, por ejemplo 0991234567 o +57 601 234 5678.",
  });
  expect(api).not.toHaveBeenCalled();
});

test("CRM-15: crea la empresa normalizada y revalida el listado; un 409 va al RUC", async () => {
  api.mockResolvedValueOnce(Response.json({ id: "e1" }, { status: 201 }));
  const result = await saveCompany(
    empty,
    form({
      name: " Wave  Comercial ",
      taxId: "179 1234561 001",
      phone: "601 234 5678",
      phoneCountry: "CO",
      tags: "Cliente, VIP",
    }),
  );
  expect(result.saved).toBe(true);
  expect(JSON.parse(api.mock.calls[0]?.[1]?.body as string)).toEqual(
    expect.objectContaining({
      name: "Wave Comercial",
      taxId: "1791234561001",
      phone: "+576012345678",
      tags: ["cliente", "vip"],
    }),
  );
  expect(revalidatePath).toHaveBeenCalledWith("/empresas");

  api.mockResolvedValueOnce(
    Response.json(
      { error: { message: "Ya existe una empresa con ese RUC." } },
      { status: 409 },
    ),
  );
  const duplicate = await saveCompany(
    empty,
    form({ name: "Otra", taxId: "1791234561001" }),
  );
  expect(duplicate.fieldErrors.taxId).toBe(
    "Ya existe una empresa con ese RUC.",
  );
});

test("CRM-15: otros fallos del API o de conexión van a la alerta general", async () => {
  api.mockResolvedValueOnce(
    Response.json({ error: { message: "Sin permiso." } }, { status: 403 }),
  );
  const denied = await saveCompany(
    empty,
    form({ name: "Wave", taxId: "1791234561001" }),
  );
  expect(denied.feedback).toEqual({ tone: "error", message: "Sin permiso." });

  api.mockRejectedValueOnce(new Error("red"));
  const offline = await saveCompany(
    empty,
    form({ name: "Wave", taxId: "1791234561001" }),
  );
  expect(offline.feedback?.message).toBe(
    "No pudimos conectar con el servidor. Inténtalo de nuevo.",
  );
});

test("la edicion valida sitio y direccion antes de llamar al API", async () => {
  const result = await saveCompany(
    empty,
    form({
      id: "e1",
      name: "Wave",
      taxId: "1791234561001",
      website: "wave.ec",
      address: "x".repeat(201),
    }),
  );

  expect(result.fieldErrors).toEqual({
    website: "Escribe un sitio web válido con http:// o https://.",
    address: "La dirección debe tener entre 1 y 200 caracteres.",
  });
  expect(api).not.toHaveBeenCalled();
});

test("la edicion usa PATCH y revalida listado y ficha", async () => {
  api.mockResolvedValueOnce(Response.json({ id: "e1" }));

  const result = await saveCompany(
    empty,
    form({
      id: "e1",
      name: "Wave Ecuador",
      taxId: "1791234561001",
      website: "https://wave.ec",
      address: "Av. Republica 123",
    }),
  );

  expect(api).toHaveBeenCalledWith(
    "/companies/e1",
    expect.objectContaining({ method: "PATCH" }),
  );
  expect(result.feedback).toEqual({
    tone: "success",
    message: "Empresa actualizada.",
  });
  expect(revalidatePath).toHaveBeenCalledWith("/empresas");
  expect(revalidatePath).toHaveBeenCalledWith("/empresas/e1");
});
