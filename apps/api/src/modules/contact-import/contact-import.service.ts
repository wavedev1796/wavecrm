import { BadRequestException, ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@wave/database';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { ContactImportRowDto, IMPORT_FIELDS, type ImportField } from './contact-import.dto';
import { decodeCsv, parseCsv } from './csv';

export const MAX_IMPORT_ROWS = 1000;

/** El archivo tal como lo entrega multer (sin depender de @types/multer). */
export type UploadedCsv = { originalname: string; buffer: Buffer };

type Mapping = Partial<Record<ImportField, string>>;
type Row = { number: number; contact: ContactImportRowDto; errors: Map<ImportField, string> };

@Injectable()
export class ContactImportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Todo o nada: valida cada fila y solo guarda si ninguna tiene errores. */
  async importCsv(file: UploadedCsv | undefined, rawMapping: string | undefined, ownerId: string) {
    const { header, lines } = readFile(file);
    const mapping = parseMapping(rawMapping, header);
    const rows: Row[] = [];
    for (const { number, cells } of lines) {
      const contact = plainToInstance(
        ContactImportRowDto,
        Object.fromEntries(Object.entries(mapping).map(([field, column]) => [field, cells[header.indexOf(column)] ?? ''])),
      );
      const invalid = await validate(contact, { stopAtFirstError: true });
      const errors = invalid.map(
        (error) => [error.property as ImportField, Object.values(error.constraints ?? {})[0] ?? 'Solicitud inválida.'] as const,
      );
      rows.push({ number, contact, errors: new Map(errors) });
    }
    const companyIds = await this.checkReferences(rows);

    const failed = rows.filter((row) => row.errors.size);
    if (failed.length) {
      const summary = failed.length === 1 ? '1 fila tiene errores' : `${failed.length} filas tienen errores`;
      throw new UnprocessableEntityException({
        message: `No se importó ningún contacto: ${summary}.`,
        errors: failed.flatMap((row) =>
          IMPORT_FIELDS.filter((field) => row.errors.has(field)).map((field) => ({
            row: row.number,
            column: mapping[field],
            message: row.errors.get(field),
          })),
        ),
      });
    }

    try {
      // createMany es una sola sentencia INSERT: o entran todas las filas o ninguna.
      const { count } = await this.prisma.contact.createMany({
        data: rows.map(({ contact: { companyTaxId, ...fields } }) => ({
          ...fields,
          companyId: companyTaxId ? companyIds.get(companyTaxId) : null,
          ownerId,
        })),
      });
      return { imported: count };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'Otra persona registró una de estas cédulas mientras importabas. Vuelve a subir el archivo.',
        );
      }
      throw error;
    }
  }

  /** Cédula única (en el archivo y en la base) y empresa existente por RUC. Devuelve el id de cada RUC. */
  private async checkReferences(rows: Row[]) {
    const valid = (row: Row, field: 'documentId' | 'companyTaxId') => (row.errors.has(field) ? null : row.contact[field]);
    const firstRow = new Map<string, number>();
    for (const row of rows) {
      const documentId = valid(row, 'documentId');
      if (!documentId) continue;
      const first = firstRow.get(documentId);
      if (first) row.errors.set('documentId', `La cédula se repite en la fila ${first}.`);
      else firstRow.set(documentId, row.number);
    }
    const taxIds = rows.map((row) => valid(row, 'companyTaxId')).filter((taxId): taxId is string => Boolean(taxId));
    const [existing, companies] = await Promise.all([
      this.prisma.contact.findMany({ where: { documentId: { in: [...firstRow.keys()] } }, select: { documentId: true } }),
      this.prisma.company.findMany({ where: { taxId: { in: taxIds } }, select: { id: true, taxId: true } }),
    ]);
    const taken = new Set(existing.map((contact) => contact.documentId));
    const companyIds = new Map(companies.map((company) => [company.taxId, company.id]));
    for (const row of rows) {
      const documentId = valid(row, 'documentId');
      if (documentId && taken.has(documentId)) row.errors.set('documentId', 'Ya existe un contacto con esa cédula.');
      const taxId = valid(row, 'companyTaxId');
      if (taxId && !companyIds.has(taxId)) row.errors.set('companyTaxId', 'No existe una empresa con ese RUC.');
    }
    return companyIds;
  }
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

/** `{ campo: cabecera }`: solo campos importables, columnas que existan, y nombre y apellido obligatorios. */
function parseMapping(raw: string | undefined, header: string[]): Mapping {
  let mapping: unknown = null;
  try {
    mapping = JSON.parse(raw ?? '');
  } catch {
    // Se rechaza abajo con el mismo mensaje que un mapeo que no es un objeto.
  }
  const invalid = new BadRequestException('El mapeo de columnas no tiene un formato válido.');
  if (typeof mapping !== 'object' || mapping === null || Array.isArray(mapping)) throw invalid;
  for (const [field, column] of Object.entries(mapping)) {
    if (!(IMPORT_FIELDS as readonly string[]).includes(field)) {
      throw new BadRequestException(`El campo «${field}» no se puede importar.`);
    }
    if (typeof column !== 'string') throw invalid;
    if (!header.includes(column)) throw new BadRequestException(`La columna «${column}» no está en el archivo.`);
  }
  const result = mapping as Mapping;
  if (!result.firstName) throw new BadRequestException('Asigna la columna del nombre.');
  if (!result.lastName) throw new BadRequestException('Asigna la columna del apellido.');
  return result;
}
