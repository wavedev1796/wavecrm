// Solo la cabecera del CSV, para armar el mapeo antes de subirlo. El archivo completo lo lee y valida el API
// (apps/api/src/common/csv.ts) con la misma decodificación, delimitador y comillas.

/** Un campo importable: etiqueta en pantalla y nombres de cabecera que se le proponen (sin tildes ni mayúsculas). */
export type ImportFieldSpec = {
  field: string;
  label: string;
  required?: boolean;
  aliases: readonly string[];
};

const key = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();
const count = (text: string, char: string) => text.split(char).length - 1;

/** Columnas de la primera línea, leídas como el API: UTF-8 o Windows-1252, `;` o `,`, comillas. */
export async function readCsvHeader(file: Blob): Promise<string[]> {
  const bytes = await file.slice(0, 64 * 1024).arrayBuffer();
  let text: string;
  try {
    // stream: un carácter UTF-8 cortado en el límite de 64 KB no cuenta como error.
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes, {
      stream: true,
    });
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  const line = text.split(/\r\n|\r|\n/, 1)[0] ?? "";
  const delimiter = count(line, ";") > count(line, ",") ? ";" : ",";
  return splitCells(line, delimiter)
    .map((cell) => cell.trim())
    .filter(Boolean);
}

/** Columna sugerida para cada campo según el nombre de la cabecera. */
export function guessMapping(
  columns: string[],
  fields: readonly ImportFieldSpec[],
): Record<string, string> {
  const byKey = new Map(columns.map((column) => [key(column), column]));
  return Object.fromEntries(
    fields.flatMap(({ field, aliases }) => {
      const column = aliases.map((alias) => byKey.get(alias)).find(Boolean);
      return column ? [[field, column]] : [];
    }),
  );
}

/** Mismas reglas de comillas que el lector del API, para una sola línea. */
function splitCells(line: string, delimiter: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  let closed = false;
  for (const char of line) {
    const escaped = closed && char === '"';
    closed = quoted && char === '"';
    if (closed) quoted = false;
    else if (quoted) cell += char;
    else if (escaped) {
      cell += '"';
      quoted = true;
    } else if (char === '"' && cell === "") quoted = true;
    else if (char === delimiter) {
      cells.push(cell);
      cell = "";
    } else cell += char;
  }
  return [...cells, cell];
}
