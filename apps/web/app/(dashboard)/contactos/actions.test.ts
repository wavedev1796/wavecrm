import { revalidatePath } from "next/cache";
import { beforeEach, expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import { saveContact, searchCompanies } from "./actions";
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

const person = {
  firstName: "Ana",
  lastName: "López",
  documentType: "CEDULA",
  documentId: "1712345675",
};

beforeEach(() => vi.clearAllMocks());

test("CRM-14: usa los validadores antes de llamar al API", async () => {
  const result = await saveContact(
    empty,
    form({
      firstName: "A1",
      lastName: "X",
      documentType: "CEDULA",
      documentId: "171",
      company: "Andina",
      phone: "123",
      province: "Atlantis",
    }),
  );
  expect(result.fieldErrors).toEqual(
    expect.objectContaining({
      documentId: "La cédula debe tener 10 dígitos.",
      company: "Elige una empresa de la lista o deja el campo vacío.",
      phone:
        "Escribe un teléfono válido, por ejemplo 0991234567 o +57 601 234 5678.",
      province: "Elige una provincia de Ecuador.",
    }),
  );
  expect(api).not.toHaveBeenCalled();
});

test("CRM-14: normaliza y actualiza el contacto con su documento y su empresa", async () => {
  api.mockResolvedValueOnce(Response.json({ id: "contact-1" }));
  const result = await saveContact(
    empty,
    form({
      id: "contact-1",
      firstName: " Ana ",
      lastName: " López ",
      documentType: "CEDULA",
      documentId: "171234567-5",
      company: "Comercial Andina · 1791234561001",
      companyId: "company-1",
      phone: "099 123 4567",
      province: "Pichincha",
      tags: "Cliente, VIP, cliente",
    }),
  );
  expect(api).toHaveBeenCalledTimes(1);
  const [path, init] = api.mock.calls[0] ?? [];
  expect(path).toBe("/contacts/contact-1");
  expect(init?.method).toBe("PATCH");
  expect(JSON.parse(init?.body as string)).toEqual(
    expect.objectContaining({
      firstName: "Ana",
      documentType: "CEDULA",
      documentId: "1712345675",
      companyId: "company-1",
      phone: "+593991234567",
      tags: ["cliente", "vip"],
    }),
  );
  expect(result.feedback).toEqual({
    tone: "success",
    message: "Contacto actualizado.",
  });
  expect(revalidatePath).toHaveBeenCalledWith("/contactos/contact-1");
});

test("el documento es obligatorio: sin número no llama al API", async () => {
  const result = await saveContact(
    empty,
    form({ ...person, documentId: "  " }),
  );
  expect(result.fieldErrors.documentId).toBe("Ingresa el número de documento.");
  expect(api).not.toHaveBeenCalled();
});

test("la empresa es opcional: sin empresa se guarda sin vínculo", async () => {
  api.mockResolvedValueOnce(Response.json({ id: "contact-1" }));
  const result = await saveContact(empty, form({ ...person, company: "" }));
  expect(result.fieldErrors).toEqual({});
  expect(JSON.parse(api.mock.calls[0]?.[1]?.body as string)).toEqual(
    expect.objectContaining({ companyId: null }),
  );
});

test("envía el teléfono en E.164 según el país elegido", async () => {
  api.mockResolvedValueOnce(Response.json({ id: "contact-1" }));
  await saveContact(
    empty,
    form({
      ...person,
      phone: "601 234 5678",
      phoneCountry: "CO",
    }),
  );
  expect(api).toHaveBeenCalledWith(
    "/contacts",
    expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"phone":"+576012345678"'),
    }),
  );
});

test("un pasaporte se normaliza y un 409 se muestra junto al documento", async () => {
  api.mockResolvedValueOnce(
    Response.json(
      { error: { message: "Ya existe un contacto con ese documento." } },
      { status: 409 },
    ),
  );
  const result = await saveContact(
    empty,
    form({
      firstName: "Ana",
      lastName: "López",
      documentType: "PASAPORTE",
      documentId: "ab 123456",
    }),
  );
  expect(JSON.parse(api.mock.calls[0]?.[1]?.body as string)).toEqual(
    expect.objectContaining({
      documentType: "PASAPORTE",
      documentId: "AB123456",
      companyId: null,
    }),
  );
  expect(result.fieldErrors.documentId).toBe(
    "Ya existe un contacto con ese documento.",
  );
  expect(result.feedback).toBeNull();
});

test("searchCompanies sugiere empresas por nombre o RUC", async () => {
  api.mockResolvedValueOnce(
    Response.json({
      data: [
        { id: "e1", name: "Comercial Andina", taxId: "1791234561001" },
        { id: "e2", name: "Sin RUC", taxId: null },
      ],
    }),
  );
  expect(await searchCompanies(" andina ")).toEqual([
    {
      id: "e1",
      label: "Comercial Andina · 1791234561001",
      taxId: "1791234561001",
    },
    { id: "e2", label: "Sin RUC", taxId: null },
  ]);
  expect(api).toHaveBeenCalledWith("/companies?search=andina&limit=8");
  expect(await searchCompanies("  ")).toEqual([]);
});

test("otros fallos del API o de conexión van a la alerta; la búsqueda de empresa sin conexión no sugiere nada", async () => {
  api.mockResolvedValueOnce(
    Response.json({ error: { message: "Sin permiso." } }, { status: 403 }),
  );
  const denied = await saveContact(empty, form(person));
  expect(denied.feedback).toEqual({ tone: "error", message: "Sin permiso." });

  api.mockRejectedValueOnce(new Error("red"));
  const offline = await saveContact(empty, form(person));
  expect(offline.feedback?.message).toBe(
    "No pudimos conectar con el servidor. Inténtalo de nuevo.",
  );

  api.mockRejectedValueOnce(new Error("red"));
  expect(await searchCompanies("andina")).toEqual([]);
});
