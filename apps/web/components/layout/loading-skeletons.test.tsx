import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import {
  DetailPageSkeleton,
  ImportPageSkeleton,
  ListPageSkeleton,
  TableSkeleton,
  UsersPageSkeleton,
} from "./loading-skeletons";

const COLUMNAS = ["Contacto", "Empresa", "Provincia"];

test("la tabla esqueleto anuncia su texto y repite los encabezados reales", () => {
  render(<TableSkeleton columns={COLUMNAS} label="Cargando contactos…" rows={4} withAvatar />);

  expect(screen.getByRole("status", { name: "Cargando contactos…" })).toBeInTheDocument();
  const table = document.querySelector("table");
  expect(table).toHaveAttribute("aria-hidden", "true");
  expect([...document.querySelectorAll("th")].map((th) => th.textContent)).toEqual(COLUMNAS);
  expect(document.querySelectorAll("tbody tr")).toHaveLength(4);
  expect(document.querySelectorAll("tbody td")).toHaveLength(12);
  // El avatar va solo en la primera columna de cada fila.
  expect(document.querySelectorAll(".skeleton-avatar--sm")).toHaveLength(4);
  expect(document.querySelectorAll("td:first-child .skeleton-avatar--sm")).toHaveLength(4);
  expect(document.querySelector(".table-footer")).toHaveAttribute("aria-hidden", "true");
});

test("sin avatar, la tabla esqueleto pinta 10 filas por defecto", () => {
  render(<TableSkeleton columns={COLUMNAS} label="Cargando empresas…" />);

  expect(document.querySelectorAll("tbody tr")).toHaveLength(10);
  expect(document.querySelector(".skeleton-avatar--sm")).toBeNull();
});

test("el directorio esqueleto usa la cabecera y los filtros reales, ocultos al lector", () => {
  render(<ListPageSkeleton columns={COLUMNAS} label="Cargando contactos…" withAvatar />);

  expect(screen.getByRole("status", { name: "Cargando contactos…" })).toBeInTheDocument();
  expect(document.querySelector(".contact-list-header")).toHaveAttribute("aria-hidden", "true");
  expect(document.querySelector(".contact-filter-panel")).toHaveAttribute("aria-hidden", "true");
  expect(document.querySelectorAll("th")).toHaveLength(3);
  // Lo único expuesto al lector de pantalla es el aviso de carga.
  expect(screen.queryByRole("banner")).toBeNull();
  expect(screen.queryByRole("heading")).toBeNull();
  expect(screen.queryByRole("table")).toBeNull();
  expect(screen.getAllByRole("status")).toHaveLength(1);
});

test("la ficha esqueleto conserva perfil, datos y formulario", () => {
  render(<DetailPageSkeleton label="Cargando contacto…" />);

  expect(screen.getByRole("status", { name: "Cargando contacto…" })).toBeInTheDocument();
  expect(document.querySelector(".contact-profile")).toBeInTheDocument();
  expect(document.querySelector(".contact-detail-grid .contact-detail-main")).toBeInTheDocument();
  expect(document.querySelector(".skeleton-form")).toBeInTheDocument();
});

test("usuarios esqueleto: resumen, invitación y la tabla de usuarios", () => {
  render(<UsersPageSkeleton columns={["Usuario", "Rol"]} label="Cargando usuarios…" />);

  expect(screen.getByRole("status", { name: "Cargando usuarios…" })).toBeInTheDocument();
  expect(document.querySelectorAll(".user-summary .card")).toHaveLength(4);
  expect(document.querySelector(".users-data-card table")).toHaveClass("users-table");
});

test("la importación esqueleto anuncia su texto", () => {
  render(<ImportPageSkeleton label="Cargando importación…" />);

  expect(screen.getByRole("status", { name: "Cargando importación…" })).toBeInTheDocument();
  expect(document.querySelector(".skeleton-dropzone")).toBeInTheDocument();
});
