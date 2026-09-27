import { Filter, X } from "lucide-react";
import Link from "next/link";
import { LiveSearch } from "@/components/live-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROVINCES } from "@/lib/ecuador";
import type { ListParams } from "@/lib/list-params";

type Props = Readonly<{
  basePath: string;
  params: ListParams;
  searchLabel: string;
  searchPlaceholder: string;
}>;

/** Buscador en vivo; provincia y etiqueta se aplican con el botón (también envía la búsqueda). */
export function ListFilters({
  basePath,
  params,
  searchLabel,
  searchPlaceholder,
}: Props) {
  return (
    <form className="contact-filter-panel" method="get" action={basePath}>
      <LiveSearch
        basePath={basePath}
        params={params}
        label={searchLabel}
        placeholder={searchPlaceholder}
      />
      <div className="contact-filter-fields">
        <select
          name="province"
          defaultValue={params.province ?? ""}
          aria-label="Filtrar por provincia"
        >
          <option value="">Todas las provincias</option>
          {PROVINCES.map((province) => (
            <option key={province}>{province}</option>
          ))}
        </select>
        <Input
          name="tag"
          defaultValue={params.tag}
          maxLength={30}
          placeholder="Etiqueta"
          aria-label="Filtrar por etiqueta"
        />
        <Button type="submit">
          <Filter aria-hidden />
          Aplicar filtros
        </Button>
        {(params.search || params.province || params.tag) && (
          <Link className="button button--ghost" href={basePath}>
            <X aria-hidden />
            Limpiar
          </Link>
        )}
      </div>
    </form>
  );
}
