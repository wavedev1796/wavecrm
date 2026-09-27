import { revalidatePath } from "next/cache";
import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import { importCompanies } from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/lib/authenticated-api", () => ({
  authenticatedApi: vi.fn(),
  apiError: vi.fn(),
}));

test("CRM-15: reenvía el CSV a /companies/import y anuncia las empresas importadas", async () => {
  vi.mocked(authenticatedApi).mockResolvedValue(
    Response.json({ imported: 3 }, { status: 201 }),
  );
  const data = new FormData();
  data.set("file", new File(["Nombre;RUC"], "empresas.csv"));
  data.set("mapping", '{"name":"Nombre","taxId":"RUC"}');
  expect(await importCompanies(null, data)).toEqual({
    tone: "success",
    message: "Se importaron 3 empresas.",
    errors: [],
  });
  expect(authenticatedApi).toHaveBeenCalledWith(
    "/companies/import",
    expect.objectContaining({ method: "POST" }),
  );
  expect(revalidatePath).toHaveBeenCalledWith("/empresas");
});
