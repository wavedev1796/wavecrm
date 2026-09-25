import { BadRequestException } from '@nestjs/common';

// Lector de CSV (RFC 4180) para la importación de contactos: comillas, "" escapado y saltos de línea
// dentro de comillas. La web lee la cabecera con las mismas reglas (contactos/importar/csv-header.ts).

/** UTF-8 y, si el archivo no lo es, Windows-1252 (el "CSV" de Excel en español). TextDecoder quita el BOM. */
export function decodeCsv(buffer: Uint8Array) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

const count = (text: string, char: string) => text.split(char).length - 1;

/** `;` si la cabecera tiene más `;` que `,` (Excel en español); si no, `,`. */
export function detectDelimiter(text: string) {
  const header = text.slice(0, text.search(/\r|\n|$/));
  return count(header, ';') > count(header, ',') ? ';' : ',';
}

export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let closed = false; // la comilla anterior cerró un tramo entre comillas: si sigue otra, es un "" escapado
  for (const char of text.replace(/\r\n?/g, '\n')) {
    const escaped = closed && char === '"';
    closed = quoted && char === '"';
    if (closed) quoted = false;
    else if (quoted) cell += char;
    else if (escaped) {
      cell += '"';
      quoted = true;
    } else if (char === '"' && cell === '') quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      rows.push([...row, cell]);
      row = [];
      cell = '';
    } else cell += char;
  }
  if (quoted) throw new BadRequestException('El archivo CSV no tiene un formato válido.');
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}
