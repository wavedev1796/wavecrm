import { PROVINCES } from "@/lib/ecuador";

/** Filtros de un listado tal como llegan en la URL. */
export type ListParams = { search?: string; province?: string; tag?: string };

function filters(params: ListParams, query = new URLSearchParams()) {
  if (params.search) query.set("search", params.search);
  if (params.province) query.set("province", params.province);
  if (params.tag) query.set("tag", params.tag);
  return query;
}

/** Ruta del listado con sus filtros; sin `page` (o con 1) vuelve a la primera página. */
export function listHref(basePath: string, params: ListParams, page?: number) {
  const query = filters(params);
  if (page && page > 1) query.set("page", String(page));
  const text = String(query);
  return text ? `${basePath}?${text}` : basePath;
}

/** Consulta del API: página válida, límite y filtros. Una provincia desconocida se ignora. */
export function listQuery(
  params: ListParams & { page?: string },
  limit: number,
) {
  const page = Number(params.page);
  const query = new URLSearchParams({
    page: String(Number.isInteger(page) && page > 0 ? page : 1),
    limit: String(limit),
  });
  const province = (PROVINCES as readonly string[]).includes(
    params.province ?? "",
  )
    ? params.province
    : undefined;
  return filters({ ...params, province }, query);
}
