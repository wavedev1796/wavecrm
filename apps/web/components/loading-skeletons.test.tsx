import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import {
  DetailPageSkeleton,
  ListPageSkeleton,
  UsersPageSkeleton,
} from "./loading-skeletons";

test("list skeleton announces loading and keeps a five-column table shape", () => {
  render(<ListPageSkeleton columns={5} />);

  expect(screen.getByRole("status", { name: "Cargando contenido" })).toBeInTheDocument();
  const table = document.querySelector(".skeleton-table");
  expect(table).toHaveStyle({ "--skeleton-columns": "5" });
  expect(table?.querySelectorAll(".skeleton-table-row")).toHaveLength(6);
});

test("detail skeleton keeps profile, information and edit form regions", () => {
  render(<DetailPageSkeleton />);

  expect(screen.getByRole("status", { name: "Cargando contenido" })).toBeInTheDocument();
  expect(document.querySelector(".skeleton-profile")).toBeInTheDocument();
  expect(document.querySelector(".contact-detail-grid .contact-detail-main")).toBeInTheDocument();
  expect(document.querySelector(".skeleton-form")).toBeInTheDocument();
});

test("users skeleton keeps summary cards and table while content loads", () => {
  render(<UsersPageSkeleton />);

  expect(screen.getByRole("status", { name: "Cargando contenido" })).toBeInTheDocument();
  expect(document.querySelectorAll(".user-summary .card")).toHaveLength(4);
  expect(document.querySelectorAll(".users-data-card .skeleton-table-row")).toHaveLength(6);
});
