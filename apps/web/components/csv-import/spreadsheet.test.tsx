import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import readXlsxFile from "read-excel-file/browser";
import writeXlsxFile from "write-excel-file/browser";
import { afterEach, expect, test, vi } from "vitest";
import { CONTACT_IMPORT_FIELDS } from "@/app/(dashboard)/contactos/importar/fields";
import { COMPANY_IMPORT_FIELDS } from "@/app/(dashboard)/empresas/importar/fields";
import {
  guessMapping,
  readCsvHeader,
  type ImportFieldSpec,
} from "./csv-header";
import { asCsv } from "./spreadsheet";
import { TemplateDownload } from "./template-download";

afterEach(() => vi.restoreAllMocks());

/** Captura lo que se descargaría: el Blob y el nombre del archivo. */
function captureDownloads() {
  const blobs: Blob[] = [];
  const names: string[] = [];
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return "blob:plantilla";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    function (this: HTMLAnchorElement) {
      names.push(this.download);
    },
  );
  return { blobs, names };
}

test("CRM-17: un Excel se convierte a CSV con su primera hoja, sin perder ceros ni comillas", async () => {
  const sheet = await writeXlsxFile([
    ["Nombre", "Documento", "Notas"],
    ["Ana", { value: "0912345678", type: String }, 'dice "hola", ok'],
    ["Luis", 1712345675001, null],
  ]).toBlob();

  const csv = await asCsv(new File([sheet], "contactos.xlsx"));
  expect(csv.name).toBe("contactos.csv");
  expect(await csv.text()).toBe(
    'Nombre,Documento,Notas\r\nAna,0912345678,"dice ""hola"", ok"\r\nLuis,1712345675001,',
  );
});

test("CRM-17: un CSV pasa sin cambios y un .xlsx dañado falla", async () => {
  const file = new File(["Nombre\nAna"], "contactos.csv");
  expect(await asCsv(file)).toBe(file);
  await expect(asCsv(new File(["roto"], "roto.xlsx"))).rejects.toThrow();
});

/** Ayuda de prueba por campo (la real vive en content/). El ejemplo empieza con 0: debe llegar como texto. */
function guideFor(
  hoja: string,
  varios: string,
  fields: readonly ImportFieldSpec[],
) {
  const columnas = Object.fromEntries(
    fields.map(({ field, label }) => [
      field,
      { ayuda: `Qué va en ${label}`, ejemplo: "0991234567" },
    ]),
  );
  return { hoja, varios, columnas };
}

test.each([
  ["contactos", "Contactos", CONTACT_IMPORT_FIELDS],
  ["empresas", "Empresas", COMPANY_IMPORT_FIELDS],
] as const)(
  "CRM-18: las plantillas de %s traen cada campo y el mapeo se propone completo",
  async (noun, hoja, specs) => {
    const fields: readonly ImportFieldSpec[] = specs;
    const { blobs, names } = captureDownloads();
    const user = userEvent.setup();
    render(
      <TemplateDownload
        fields={fields}
        fileName={`plantilla-${noun}`}
        guide={guideFor(hoja, noun, fields)}
        rules={["Regla de prueba."]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Descargar plantilla CSV" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Descargar plantilla Excel" }),
    );
    await vi.waitFor(() => expect(names).toHaveLength(2));
    expect(names).toEqual([`plantilla-${noun}.csv`, `plantilla-${noun}.xlsx`]);

    const [csv, xlsx] = blobs as [Blob, Blob];
    const labels = fields.map(({ label }) => label);
    // BOM y `;` para el Excel en español (text() descarta el BOM: se mira en los bytes).
    const bytes = new Uint8Array(await csv.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(await csv.text()).toBe(labels.join(";") + "\r\n");
    const fromExcel = await asCsv(new File([xlsx], "plantilla.xlsx"));
    for (const file of [csv, fromExcel]) {
      const header = await readCsvHeader(file);
      expect(header).toEqual(labels);
      expect(Object.keys(guessMapping(header, fields))).toEqual(
        fields.map(({ field }) => field),
      );
    }
  },
);

test("CRM-18: el Excel trae la hoja de datos vacía y otra de instrucciones por columna", async () => {
  const { blobs } = captureDownloads();
  const user = userEvent.setup();
  const fields: readonly ImportFieldSpec[] = CONTACT_IMPORT_FIELDS;
  render(
    <TemplateDownload
      fields={fields}
      fileName="plantilla-contactos"
      guide={guideFor("Contactos", "contactos", fields)}
      rules={["Regla de prueba."]}
    />,
  );
  await user.click(
    screen.getByRole("button", { name: "Descargar plantilla Excel" }),
  );
  await vi.waitFor(() => expect(blobs).toHaveLength(1));

  const [datos, instrucciones] = await readXlsxFile(blobs[0] as Blob);
  // Primero la hoja que se importa, solo con la cabecera: los bordes y las bandas no agregan filas.
  expect(datos?.sheet).toBe("Contactos");
  expect(datos?.data).toEqual([fields.map(({ label }) => label)]);

  expect(instrucciones?.sheet).toBe("Instrucciones");
  const rows = instrucciones?.data ?? [];
  expect(rows[0]?.[0]).toBe("Cómo llenar la plantilla de contactos");
  expect(rows[1]?.[0]).toBe(
    "1. Escribe los datos en la hoja «Contactos»: una fila por registro, desde la fila 2.",
  );
  expect(rows).toContainEqual([
    "Columna",
    "¿Obligatoria?",
    "Qué escribir",
    "Ejemplo",
  ]);
  for (const { label, required } of fields) {
    expect(rows).toContainEqual([
      label,
      required ? "Sí" : "No",
      `Qué va en ${label}`,
      "0991234567",
    ]);
  }
  expect(rows.at(-1)?.[0]).toBe("• Regla de prueba.");
});
