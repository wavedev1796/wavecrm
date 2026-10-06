// Excel en la importación (CRM-17 y CRM-18). Un .xlsx se convierte a CSV en el navegador, así el API recibe
// siempre un CSV y lo valida igual. Las librerías se cargan solo cuando se usan.
import type { ImportFieldSpec } from "./csv-header";

const EXCEL = /\.xlsx$/i;

const csvCell = (value: unknown) => {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** El archivo tal como lo recibe el API: un CSV queda igual; un Excel, su primera hoja como CSV UTF-8. */
export async function asCsv(file: File): Promise<File> {
  if (!EXCEL.test(file.name)) return file;
  const { readSheet } = await import("read-excel-file/browser");
  // El número tal como está en la celda ("1712345675001"), sin pasar por Number.
  const rows = await readSheet(file, { parseNumber: (raw) => raw });
  const text = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new File([text], file.name.replace(EXCEL, ".csv"), {
    type: "text/csv",
  });
}

function save(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Plantilla con una columna por campo, con el nombre que se ve en pantalla (guessMapping la reconoce). */
export async function downloadTemplate(
  fields: readonly ImportFieldSpec[],
  name: string,
  format: "xlsx" | "csv",
) {
  const header = fields.map(({ label }) => label);
  if (format === "csv") {
    // BOM y `;`: así el Excel en español la abre en columnas y con tildes.
    const bom = String.fromCodePoint(0xfeff);
    save(
      new Blob([bom + header.join(";") + "\r\n"], { type: "text/csv" }),
      `${name}.csv`,
    );
    return;
  }
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const blob = await writeXlsxFile(
    [header.map((value) => ({ value, fontWeight: "bold" as const }))],
    {
      columns: header.map((label) => ({ width: Math.max(14, label.length + 4) })),
      stickyRowsCount: 1,
    },
  ).toBlob();
  save(blob, `${name}.xlsx`);
}
