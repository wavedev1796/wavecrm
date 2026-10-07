// Excel en la importación (CRM-17 y CRM-18). Un .xlsx se convierte a CSV en el navegador, así el API recibe
// siempre un CSV y lo valida igual. Las librerías se cargan solo cuando se usan.
import type { Row, Sheet } from "write-excel-file/browser";
import { IMPORTACION } from "@/content/importacion";
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

/** Hoja de datos y textos de la hoja Instrucciones de una importación (salen de `content/importacion.ts`). */
export type TemplateGuide<Field extends string = string> = Readonly<{
  /** Nombre de la hoja de datos: "Contactos". */
  hoja: string;
  varios: string;
  /** Qué escribir en cada columna, con un ejemplo válido. Exige una entrada por cada `field`. */
  columnas: Readonly<
    Record<Field, Readonly<{ ayuda: string; ejemplo: string }>>
  >;
}>;

export type Template<Spec extends ImportFieldSpec = ImportFieldSpec> =
  Readonly<{
    fields: readonly Spec[];
    /** Nombre del archivo descargado, sin extensión: "plantilla-contactos". */
    fileName: string;
    guide: TemplateGuide<Spec["field"]>;
    /** Reglas de la pantalla; las instrucciones las repiten al final. */
    rules: readonly string[];
  }>;

// Colores de docs/design/TOKENS.md en hexadecimal: el .xlsx no lee variables CSS.
const WAVE = {
  blue: "#2F6F8F",
  blueDark: "#255A74",
  blueSoft: "#EAF2F6",
  blueLine: "#CFE0E8",
  line: "#DEDDD4",
  white: "#FFFFFF",
};
const BORDER = { borderStyle: "thin", borderColor: WAVE.line } as const;
/** Filas con bordes y bandas en la hoja de datos: las que el API acepta en un archivo. */
const DATA_ROWS = 1000;

/**
 * Plantilla con una columna por campo, con el nombre que se ve en pantalla (guessMapping la reconoce).
 * El Excel trae primero la hoja de datos, que es la que se importa, y después las instrucciones.
 */
export async function downloadTemplate<Spec extends ImportFieldSpec>(
  { fields, fileName, guide, rules }: Template<Spec>,
  format: "xlsx" | "csv",
) {
  const header = fields.map(({ label }) => label);
  if (format === "csv") {
    // BOM y `;`: así el Excel en español la abre en columnas y con tildes.
    const bom = String.fromCodePoint(0xfeff);
    save(
      new Blob([bom + header.join(";") + "\r\n"], { type: "text/csv" }),
      `${fileName}.csv`,
    );
    return;
  }
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const text = IMPORTACION.plantilla.instrucciones;
  const help = (field: Spec["field"]) => guide.columnas[field];
  // Alto según las líneas de "Qué escribir" (unos 64 caracteres por línea, de sobra) más aire arriba y abajo.
  const row = (index: number, field: Spec["field"]) =>
    ({
      ...BORDER,
      wrap: true,
      alignVertical: "center",
      backgroundColor: index % 2 ? WAVE.blueSoft : WAVE.white,
      height: 16 * Math.ceil(help(field).ayuda.length / 64) + 10,
    }) as const;

  const sheets: Sheet<Blob>[] = [
    {
      sheet: guide.hoja,
      data: [
        fields.map(({ label, required }) => ({
          ...BORDER,
          value: label,
          fontWeight: "bold",
          textColor: required ? WAVE.white : WAVE.blueDark,
          backgroundColor: required ? WAVE.blueDark : WAVE.blueLine,
          height: 28,
          alignVertical: "center",
        })),
      ],
      columns: fields.map(({ field, label }) => ({
        width: Math.max(16, label.length + 6, help(field).ejemplo.length + 4),
      })),
      stickyRowsCount: 1,
      // Formato condicional y no celdas vacías con estilo: la hoja sigue sin filas y no se importa nada de más.
      conditionalFormatting: [0, 1].map((odd) => ({
        cellRange: {
          from: { row: 2, column: 1 },
          to: { row: DATA_ROWS + 1, column: fields.length },
        },
        condition: { formula: `MOD(ROW(),2)=${odd}` },
        style: odd ? { ...BORDER, backgroundColor: WAVE.blueSoft } : BORDER,
      })),
    },
    {
      sheet: text.hoja,
      showGridLines: false,
      columns: [{ width: 24 }, { width: 14 }, { width: 64 }, { width: 30 }],
      data: [
        [
          {
            value: text.titulo(guide.varios),
            fontSize: 16,
            fontWeight: "bold",
            textColor: WAVE.blueDark,
            height: 32,
            alignVertical: "center",
          },
        ],
        ...text
          .pasos(guide.hoja)
          .map((paso, index) => [`${index + 1}. ${paso}`]),
        [],
        text.columnas.map((value) => ({
          ...BORDER,
          value,
          fontWeight: "bold",
          textColor: WAVE.white,
          backgroundColor: WAVE.blue,
          height: 24,
          alignVertical: "center",
        })),
        ...fields.map(({ field, label, required }, index): Row => [
          { ...row(index, field), value: label, fontWeight: "bold" },
          {
            ...row(index, field),
            value: required ? text.si : text.no,
            align: "center",
            ...(required && { fontWeight: "bold", textColor: WAVE.blueDark }),
          },
          { ...row(index, field), value: help(field).ayuda },
          // String: el ejemplo de un documento o RUC queda como texto, como debe escribirse.
          { ...row(index, field), value: help(field).ejemplo, type: String },
        ]),
        [],
        [{ value: text.reglas, fontWeight: "bold", textColor: WAVE.blueDark }],
        ...rules.map((rule) => [`• ${rule}`]),
      ],
    },
  ];
  const blob = await writeXlsxFile(sheets).toBlob();
  save(blob, `${fileName}.xlsx`);
}
