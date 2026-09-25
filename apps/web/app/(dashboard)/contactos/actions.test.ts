import { revalidatePath } from "next/cache";
import { beforeEach, expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import { saveContact } from "./actions";
import {
  emptyContactValues,
  type ContactFormState,
} from "./contact-form-state";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/lib/authenticated-api", () => ({
  authenticatedApi: vi.fn(),
  apiError: async (response: Response) => {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? "No pudimos completar la operación.";
  },
}));

const api = vi.mocked(authenticatedApi);
const empty: ContactFormState = {
  feedback: null,
  fieldErrors: {},
  values: emptyContactValues,
};
function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => vi.clearAllMocks());

test("CRM-14: usa los validadores EC antes de llamar al API", async () => {
  const result = await saveContact(
    empty,
    form({
      firstName: "A1",
      lastName: "X",
      documentId: "171",
      companyTaxId: "179",
      phone: "123",
      province: "Atlantis",
    }),
  );
  expect(result.fieldErrors).toEqual(
    expect.objectContaining({
      documentId: "La cédula debe tener 10 dígitos.",
      companyTaxId: "El RUC debe tener 13 dígitos.",
      phone:
        "Escribe un teléfono de Ecuador, por ejemplo 0991234567 o 022345678.",
      province: "Elige una provincia de Ecuador.",
    }),
  );
  expect(api).not.toHaveBeenCalled();
});

test("CRM-14: resuelve la empresa por RUC, normaliza y actualiza el contacto", async () => {
  api.mockResolvedValueOnce(
    Response.json({ data: [{ id: "company-1", taxId: "1791234561001" }] }),
  );
  api.mockResolvedValueOnce(Response.json({ id: "contact-1" }));
  const result = await saveContact(
    empty,
    form({
      id: "contact-1",
      firstName: " Ana ",
      lastName: " López ",
      documentId: "171234567-5",
      companyTaxId: "1791234561001",
      phone: "099 123 4567",
      province: "Pichincha",
      tags: "Cliente, VIP, cliente",
    }),
  );
  expect(api).toHaveBeenNthCalledWith(
    1,
    "/companies?search=1791234561001&limit=2",
  );
  expect(api).toHaveBeenNthCalledWith(
    2,
    "/contacts/contact-1",
    expect.objectContaining({
      method: "PATCH",
      body: expect.stringContaining('"companyId":"company-1"'),
    }),
  );
  expect(result.feedback).toEqual({
    tone: "success",
    message: "Contacto actualizado.",
  });
  expect(revalidatePath).toHaveBeenCalledWith("/contactos/contact-1");
});

test("CRM-14: un RUC válido sin empresa muestra el error junto al campo", async () => {
  api.mockResolvedValue(Response.json({ data: [] }));
  const result = await saveContact(
    empty,
    form({
      firstName: "Ana",
      lastName: "López",
      companyTaxId: "1791234561001",
    }),
  );
  expect(result.fieldErrors.companyTaxId).toBe(
    "No existe una empresa con ese RUC.",
  );
});
