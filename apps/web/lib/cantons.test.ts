import { expect, test } from "vitest";
import { CANTONS_BY_PROVINCE, cantonError, officialCanton } from "./cantons";

test("incluye las 24 provincias y los 222 cantones vigentes", () => {
  expect(Object.keys(CANTONS_BY_PROVINCE)).toHaveLength(24);
  expect(Object.values(CANTONS_BY_PROVINCE).flat()).toHaveLength(222);
  expect(CANTONS_BY_PROVINCE["Morona Santiago"]).toContain("Sevilla Don Bosco");
});

test("normaliza el canton y valida que pertenezca a la provincia", () => {
  expect(officialCanton("Pichincha", "  quito ")).toBe("Quito");
  expect(cantonError("Pichincha", "Cuenca")).toBe(
    "Elige un cantón de la provincia seleccionada.",
  );
  expect(cantonError("Azuay", "Cuenca")).toBeNull();
});
