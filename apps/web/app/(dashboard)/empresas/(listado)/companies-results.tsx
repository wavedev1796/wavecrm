import Link from "next/link";
import { cache } from "react";
import { Pagination } from "@/components/data/pagination";
import { TagList } from "@/components/data/tag-list";
import { Alert } from "@/components/ui/alert";
import { Table } from "@/components/ui/table";
import { COMUN } from "@/content/comun";
import { EMPRESAS } from "@/content/empresas";
import { authenticatedApi } from "@/lib/authenticated-api";
import type { ListParams } from "@/lib/list-params";
import type { Company, CompanyList } from "../types";

/** Una sola llamada al API por render, aunque la pidan el resumen y la tabla. */
const getCompanies = cache(async (query: string): Promise<CompanyList | null> => {
  const response = await authenticatedApi(`/companies?${query}`);
  return response.ok ? ((await response.json()) as CompanyList) : null;
});

export async function CompaniesSummary({ query }: Readonly<{ query: string }>) {
  const result = await getCompanies(query);
  const texto = EMPRESAS.listado;
  return result ? texto.total(result.meta.total) : texto.resumenSinDatos;
}

export async function CompaniesResults({
  query,
  params,
}: Readonly<{ query: string; params: ListParams }>) {
  const result = await getCompanies(query);
  const texto = EMPRESAS.listado;
  if (!result) {
    return (
      <div className="data-card-alert">
        <Alert tone="error">{texto.errorCarga}</Alert>
      </div>
    );
  }
  const companies = result.data;
  return (
    <>
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
          {!companies.length && (
            <tr>
              <td colSpan={texto.columnas.length} className="empty-table">
                {texto.sinResultados}
              </td>
            </tr>
          )}
        </tbody>
      </Table>
      <Pagination
        basePath="/empresas"
        params={params}
        meta={result.meta}
        shown={companies.length}
        label={texto.paginacion}
      />
    </>
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
