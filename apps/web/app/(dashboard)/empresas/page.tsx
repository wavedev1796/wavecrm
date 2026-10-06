import { Building2 } from "lucide-react";
import Link from "next/link";
import { ListFilters } from "@/components/list-filters";
import { ListHeader } from "@/components/list-header";
import { Pagination } from "@/components/pagination";
import { TagList } from "@/components/tag-list";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { COMUN } from "@/content/comun";
import { EMPRESAS } from "@/content/empresas";
import { authenticatedApi } from "@/lib/authenticated-api";
import { listQuery } from "@/lib/list-params";
import { NewCompanyDialog } from "./new-company-dialog";
import type { Company, CompanyList } from "./types";

type PageProps = Readonly<{
  searchParams: Promise<{
    search?: string;
    province?: string;
    tag?: string;
    page?: string;
    creada?: string;
  }>;
}>;
const PAGE_SIZE = 10;

export default async function CompaniesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const response = await authenticatedApi(
    `/companies?${listQuery(params, PAGE_SIZE)}`,
  );
  const result = response.ok ? ((await response.json()) as CompanyList) : null;
  const companies = result?.data ?? [];
  const texto = EMPRESAS.listado;

  return (
    <div className="contacts-page">
      {params.creada === "1" && <Alert tone="success">{texto.creada}</Alert>}
      {!result && (
        <Alert tone="error">{texto.errorCarga}</Alert>
      )}
      <Card className="data-card">
        <ListHeader
          icon={<Building2 aria-hidden />}
          title={texto.titulo}
          summary={
            result ? texto.total(result.meta.total) : texto.resumenSinDatos
          }
          importHref="/empresas/importar"
        >
          <NewCompanyDialog />
        </ListHeader>
        <ListFilters
          basePath="/empresas"
          params={params}
          searchLabel={texto.buscar.etiqueta}
          searchPlaceholder={texto.buscar.placeholder}
        />
        <Table>
          <thead>
            <tr>
              {texto.columnas.map((columna) => (
                <th key={columna}>{columna}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <CompanyRow key={company.id} company={company} />
            ))}
            {result && !companies.length && (
              <tr>
                <td colSpan={texto.columnas.length} className="empty-table">
                  {texto.sinResultados}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
        {result && (
          <Pagination
            basePath="/empresas"
            params={params}
            meta={result.meta}
            shown={companies.length}
            label={texto.paginacion}
          />
        )}
      </Card>
    </div>
  );
}

function CompanyRow({ company }: Readonly<{ company: Company }>) {
  return (
    <tr>
      <td>
        <Link className="contact-cell contact-link" href={`/empresas/${company.id}`}>
          <span>
            <strong>{company.name}</strong>
            {company.legalName && <small>{company.legalName}</small>}
          </span>
        </Link>
      </td>
      <td>{company.taxId ?? COMUN.sinDato}</td>
      <td>{company.province ?? COMUN.sinDato}</td>
      <td>
        <TagList tags={company.tags} />
      </td>
      <td>{company._count.contacts}</td>
      <td>{company.owner?.name ?? EMPRESAS.listado.sinAsignar}</td>
    </tr>
  );
}
