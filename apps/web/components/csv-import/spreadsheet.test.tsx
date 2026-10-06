import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import writeXlsxFile from "write-excel-file/browser";
import { afterEach, expect, test, vi } from "vitest";
import { CONTACT_IMPORT_FIELDS } from "@/app/(dashboard)/contactos/importar/fields";
import { COMPANY_IMPORT_FIELDS } from "@/app/(dashboard)/empresas/importar/fields";
import { guessMapping, readCsvHeader } from "./csv-header";
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

test.each([
  ["contactos", CONTACT_IMPORT_FIELDS],
  ["empresas", COMPANY_IMPORT_FIELDS],
])(
  "CRM-18: las plantillas de %s traen cada campo y el mapeo se propone completo",
  async (noun, fields) => {
    const { blobs, names } = captureDownloads();
    const user = userEvent.setup();
    render(<TemplateDownload fields={fields} fileName={`plantilla-${noun}`} />);

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
