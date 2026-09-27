import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { decodeCsv, parseCsv } from './csv';

// Importación CSV todo o nada (CRM-16), común a contactos y empresas: leer el archivo, validar el mapeo y
// cada fila con su DTO. Cada módulo añade sus reglas de unicidad y guarda con un único createMany.

export const MAX_IMPORT_ROWS = 1000;

/** El archivo tal como lo entrega multer (sin depender de @types/multer). */
export type UploadedCsv = { originalname: string; buffer: Buffer };

export type ImportSpec<Dto, Field extends string> = {
  dto: new () => Dto;
  /** Campos importables, en el orden en que se reportan los errores de una fila. */
  fields: readonly Field[];
  /** Campo obligatorio → mensaje si el mapeo no lo trae, en el orden en que se comprueban. */
  required: Partial<Record<Field, string>>;
};

export type ImportRow<Dto, Field extends string> = { number: number; value: Dto; errors: Map<Field, string> };
type Mapping<Field extends string> = Partial<Record<Field, string>>;

/** Lee el archivo, valida el mapeo y cada fila con su DTO. Las filas vuelven con sus errores; nada se guarda aquí. */
export async function readImport<Dto extends object, Field extends string>(
  file: UploadedCsv | undefined,
  rawMapping: string | undefined,
  spec: ImportSpec<Dto, Field>,
) {
  const { header, lines } = readFile(file);
  const mapping = parseMapping(rawMapping, header, spec);
  const rows: ImportRow<Dto, Field>[] = [];
  for (const { number, cells } of lines) {
    const value = plainToInstance(
      spec.dto,
      Object.fromEntries(
        Object.entries(mapping).map(([field, column]) => [field, cells[header.indexOf(column as string)] ?? '']),
      ),
    );
    const invalid = await validate(value, { stopAtFirstError: true });
    const errors = invalid.map(
      (error) => [error.property as Field, Object.values(error.constraints ?? {})[0] ?? 'Solicitud inválida.'] as const,
    );
    rows.push({ number, value, errors: new Map(errors) });
  }
  return { mapping, rows };
}

/** Marca las filas cuyo `field` (ya válido) se repite en el archivo. Devuelve cada valor con su primera fila. */
export function markDuplicates<Dto, Field extends string & keyof Dto>(
  rows: ImportRow<Dto, Field>[],
  field: Field,
  message: (first: number) => string,
) {
  const firstRow = new Map<string, number>();
  for (const row of rows) {
    const value = row.errors.has(field) ? null : row.value[field];
    if (typeof value !== 'string' || !value) continue;
    const first = firstRow.get(value);
    if (first) row.errors.set(field, message(first));
    else firstRow.set(value, row.number);
  }
  return firstRow;
}

/** 422 con fila, columna y motivo si alguna fila falló. `noun`: "ningún contacto", "ninguna empresa". */
export function rejectInvalidRows<Dto, Field extends string>(
  rows: ImportRow<Dto, Field>[],
  mapping: Mapping<Field>,
  fields: readonly Field[],
  noun: string,
) {
  const failed = rows.filter((row) => row.errors.size);
  if (!failed.length) return;
  const summary = failed.length === 1 ? '1 fila tiene errores' : `${failed.length} filas tienen errores`;
  throw new UnprocessableEntityException({
    message: `No se importó ${noun}: ${summary}.`,
    errors: failed.flatMap((row) =>
      fields
        .filter((field) => row.errors.has(field))
        .map((field) => ({ row: row.number, column: mapping[field], message: row.errors.get(field) })),
    ),
  });
}

/** Cabecera y filas con su número en la hoja de cálculo (la cabecera es la 1). Las filas vacías no cuentan. */
function readFile(file: UploadedCsv | undefined) {
  if (!file) throw new BadRequestException('Adjunta un archivo CSV.');
  if (!file.originalname.toLowerCase().endsWith('.csv')) throw new BadRequestException('El archivo debe ser .csv.');
  const [header = [], ...rest] = parseCsv(decodeCsv(file.buffer));
  const lines = rest
    .map((cells, index) => ({ number: index + 2, cells }))
    .filter(({ cells }) => cells.some((cell) => cell.trim()));
  if (!lines.length) throw new BadRequestException('El archivo no tiene filas para importar.');
  if (lines.length > MAX_IMPORT_ROWS) {
    throw new BadRequestException(`El archivo supera las ${MAX_IMPORT_ROWS} filas. Divídelo en partes más pequeñas.`);
  }
  return { header: header.map((column) => column.trim()), lines };
}

/** `{ campo: cabecera }`: solo campos importables, columnas que existan y los campos obligatorios. */
function parseMapping<Dto, Field extends string>(
  raw: string | undefined,
  header: string[],
  spec: ImportSpec<Dto, Field>,
): Mapping<Field> {
  let mapping: unknown = null;
  try {
    mapping = JSON.parse(raw ?? '');
  } catch {
    // Se rechaza abajo con el mismo mensaje que un mapeo que no es un objeto.
  }
  const invalid = new BadRequestException('El mapeo de columnas no tiene un formato válido.');
  if (typeof mapping !== 'object' || mapping === null || Array.isArray(mapping)) throw invalid;
  for (const [field, column] of Object.entries(mapping)) {
    if (!(spec.fields as readonly string[]).includes(field)) {
      throw new BadRequestException(`El campo «${field}» no se puede importar.`);
    }
    if (typeof column !== 'string') throw invalid;
    if (!header.includes(column)) throw new BadRequestException(`La columna «${column}» no está en el archivo.`);
  }
  const result = mapping as Mapping<Field>;
  for (const [field, message] of Object.entries(spec.required) as [Field, string][]) {
    if (!result[field]) throw new BadRequestException(message);
  }
  return result;
}
