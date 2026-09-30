import { Building2 } from "lucide-react";
import Link from "next/link";
import { ListFilters } from "@/components/list-filters";
import { ListHeader } from "@/components/list-header";
import { Pagination } from "@/components/pagination";
import { TagList } from "@/components/tag-list";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
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

  return (
    <div className="contacts-page">
      {params.creada === "1" && <Alert tone="success">Empresa creada.</Alert>}
      {!result && (
        <Alert tone="error">
          No pudimos cargar las empresas. Recarga la página.
        </Alert>
      )}
      <Card className="data-card">
        <ListHeader
          icon={<Building2 aria-hidden />}
          title="Todas las empresas"
          summary={
            result
              ? companyCount(result.meta.total)
              : "Consulta y organiza tus cuentas"
          }
          importHref="/empresas/importar"
        >
          <NewCompanyDialog />
        </ListHeader>
        <ListFilters
          basePath="/empresas"
          params={params}
          searchLabel="Buscar empresa"
          searchPlaceholder="Buscar por nombre, razón social o RUC"
        />
        <Table>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>RUC</th>
              <th>Provincia</th>
              <th>Etiquetas</th>
              <th>Contactos</th>
              <th>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <CompanyRow key={company.id} company={company} />
            ))}
            {result && !companies.length && (
              <tr>
                <td colSpan={6} className="empty-table">
                  No hay empresas que coincidan con los filtros.
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
            label="Paginación de empresas"
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
      <td>{company.taxId ?? "—"}</td>
      <td>{company.province ?? "—"}</td>
      <td>
        <TagList tags={company.tags} />
      </td>
      <td>{company._count.contacts}</td>
      <td>{company.owner?.name ?? "Sin asignar"}</td>
    </tr>
  );
}

function companyCount(total: number) {
  return total === 1 ? "1 empresa registrada" : `${total} empresas registradas`;
}
