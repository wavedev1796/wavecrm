import { inflateRawSync } from "node:zlib";
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
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    names.push(this.download);
  });
  return { blobs, names };
}

test("un Excel se convierte a CSV con su primera hoja, sin perder ceros ni comillas", async () => {
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

test("un CSV pasa sin cambios y un .xlsx dañado falla", async () => {
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
      {
        ayuda: `Qué va en ${label}`,
        ejemplo: "0991234567",
        ...(field === "email" && { obligatoria: "Sí, o el teléfono" }),
      },
    ]),
  );
  return { hoja, varios, columnas };
}

/** Un archivo de dentro del .xlsx (un zip): su cabecera local trae el tamaño y viene con deflate. */
async function xlsxEntry(xlsx: Blob, name: string) {
  const zip = Buffer.from(await xlsx.arrayBuffer());
  const at = zip.indexOf(Buffer.from(`${name}`)) - 30;
  const size = zip.readUInt32LE(at + 18);
  const start = at + 30 + zip.readUInt16LE(at + 26) + zip.readUInt16LE(at + 28);
  return inflateRawSync(zip.subarray(start, start + size)).toString("utf8");
}

test.each([
  ["contactos", "Contactos", CONTACT_IMPORT_FIELDS],
  ["empresas", "Empresas", COMPANY_IMPORT_FIELDS],
] as const)(
  "las plantillas de %s traen cada campo y el mapeo se propone completo",
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

test("el Excel trae la hoja de datos vacía y otra de instrucciones por columna", async () => {
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
  for (const { field, label, required } of fields) {
    const obligatoria = field === "email" ? "Sí, o el teléfono" : null;
    expect(rows).toContainEqual([
      label,
      obligatoria ?? (required ? "Sí" : "No"),
      `Qué va en ${label}`,
      "0991234567",
    ]);
  }
  expect(rows.at(-1)?.[0]).toBe("• Regla de prueba.");
});

test("tipo de documento, provincia y cantón traen lista desplegable; el cantón según la provincia", async () => {
  const { blobs } = captureDownloads();
  const user = userEvent.setup();
  const fields: readonly ImportFieldSpec[] = CONTACT_IMPORT_FIELDS;
  render(
    <TemplateDownload
      fields={fields}
      fileName="plantilla-contactos"
      guide={guideFor("Contactos", "contactos", fields)}
      rules={[]}
    />,
  );
  await user.click(
    screen.getByRole("button", { name: "Descargar plantilla Excel" }),
  );
  await vi.waitFor(() => expect(blobs).toHaveLength(1));
  const xlsx = blobs[0] as Blob;

  // Las opciones, en una tercera hoja oculta: tipos de documento, provincias y cada cantón con su provincia.
  const [, , listas] = await readXlsxFile(xlsx);
  expect(listas?.sheet).toBe("Listas");
  const [header, ...options] = listas?.data ?? [];
  expect(header).toEqual([
    "Tipo de documento",
    "Provincia",
    "Provincia",
    "Cantón",
  ]);
  expect(options.map((row) => row[0]).filter(Boolean)).toEqual([
    "Cédula",
    "RUC",
    "Pasaporte",
  ]);
  expect(options.map((row) => row[1]).filter(Boolean)).toHaveLength(24);
  expect(options).toContainEqual([null, null, "Pichincha", "Rumiñahui"]);
  expect(await xlsxEntry(xlsx, "xl/workbook.xml")).toContain(
    'name="Listas" state="hidden"',
  );

  const sheet = await xlsxEntry(xlsx, "xl/worksheets/sheet1.xml");
  // Excel no abre el archivo si <dataValidations> no va después de todos los <conditionalFormatting>.
  expect(sheet.indexOf("<dataValidations")).toBeGreaterThan(
    sheet.lastIndexOf("</conditionalFormatting>"),
  );
  // Tipo de documento (C), provincia (G) y cantón (H), en las 1000 filas.
  expect(sheet).toContain(
    `sqref="C2:C1001"><formula1>'Listas'!$A$2:$A$4</formula1>`,
  );
  expect(sheet).toContain(
    `sqref="G2:G1001"><formula1>'Listas'!$B$2:$B$25</formula1>`,
  );
  expect(sheet).toMatch(/sqref="H2:H1001"><formula1>OFFSET\(.*MATCH\(\$G2,/);
  expect(sheet).toContain('error="Elige Cédula, RUC o Pasaporte de la lista."');
});
