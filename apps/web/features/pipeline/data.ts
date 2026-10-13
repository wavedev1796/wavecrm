import { authenticatedApi, apiError } from "@/lib/authenticated-api";
import type { Option, Pipeline } from "./types";

export async function get<T>(path: string): Promise<T> {
  const response = await authenticatedApi(path);
  if (!response.ok) throw new Error(await apiError(response));
  return response.json() as Promise<T>;
}
export async function allOptions(path: string, contact = false): Promise<Option[]> {
  const options: Option[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await get<{
      data: Array<{
        id: string;
        name: string;
        firstName: string;
        lastName: string;
      }>;
      meta?: { totalPages: number };
    }>(path + "?limit=100&page=" + page);
    options.push(
      ...result.data.map((row) => ({
        id: row.id,
        name: contact ? row.firstName + " " + row.lastName : row.name,
      })),
    );
    totalPages = result.meta?.totalPages ?? 1;
    page++;
  } while (page <= totalPages);
  return options;
}

/** Opciones del formulario de negocio (tablero y ficha). */
export async function dealFormOptions() {
  const [pipelines, contacts, companies, users] = await Promise.all([
    get<Pipeline[]>("/pipelines"),
    allOptions("/contacts", true),
    allOptions("/companies"),
    get<Option[]>("/pipeline/owners"),
  ]);
  return { pipelines, contacts, companies, users };
}
