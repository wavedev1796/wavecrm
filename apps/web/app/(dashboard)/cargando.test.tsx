import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import ContactsLoading from "./contactos/(listado)/loading";
import ContactDetailLoading from "./contactos/[id]/loading";
import ContactImportLoading from "./contactos/importar/loading";
import CompaniesLoading from "./empresas/(listado)/loading";
import CompanyDetailLoading from "./empresas/[id]/loading";
import CompanyImportLoading from "./empresas/importar/loading";
import DealDetailLoading from "./pipeline/[id]/loading";
import UsersLoading from "./usuarios/loading";

test.each([
  ["listado de contactos", "Cargando contactos…", ContactsLoading],
  ["ficha de contacto", "Cargando contacto…", ContactDetailLoading],
  ["importar contactos", "Cargando importación…", ContactImportLoading],
  ["listado de empresas", "Cargando empresas…", CompaniesLoading],
  ["ficha de empresa", "Cargando empresa…", CompanyDetailLoading],
  ["importar empresas", "Cargando importación…", CompanyImportLoading],
  ["ficha de negocio", "Cargando negocio…", DealDetailLoading],
  ["usuarios", "Cargando usuarios…", UsersLoading],
])("el esqueleto de %s anuncia solo «%s»", (_, texto, Loading) => {
  render(<Loading />);
  expect(screen.getByRole("status", { name: texto })).toBeInTheDocument();
  expect(screen.getAllByRole("status")).toHaveLength(1);
});
