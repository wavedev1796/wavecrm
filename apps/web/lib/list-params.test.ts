// @vitest-environment node
import { expect, test } from "vitest";
import { listHref, listQuery } from "./list-params";

test("listHref conserva los filtros y omite la página 1", () => {
  expect(listHref("/contactos", {})).toBe("/contactos");
  expect(
    listHref(
      "/contactos",
      { search: "Eduardo", province: "Pichincha", tag: "vip" },
      3,
    ),
  ).toBe("/contactos?search=Eduardo&province=Pichincha&tag=vip&page=3");
  expect(listHref("/empresas", { search: "andina" }, 1)).toBe(
    "/empresas?search=andina",
  );
});

test("listQuery arma la consulta del API y descarta provincias y páginas inválidas", () => {
  expect(
    String(
      listQuery(
        { page: "2", search: "Ana", province: "Pichincha", tag: "Cliente" },
        10,
      ),
    ),
  ).toBe("page=2&limit=10&search=Ana&province=Pichincha&tag=Cliente");
  expect(String(listQuery({ page: "-1", province: "Atlantis" }, 10))).toBe(
    "page=1&limit=10",
  );
});
