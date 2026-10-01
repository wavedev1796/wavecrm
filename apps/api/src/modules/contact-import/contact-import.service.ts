import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@wave/database';
import { markDuplicates, readImport, rejectInvalidRows, type ImportRow, type UploadedCsv } from '../../common/csv-import';
import { PrismaService } from '../prisma/prisma.service';
import { ContactImportRowDto, IMPORT_FIELDS, type ImportField } from './contact-import.dto';

const CONTACT_IMPORT = {
  dto: ContactImportRowDto,
  fields: IMPORT_FIELDS,
  required: {
    firstName: 'Asigna la columna del nombre.',
    lastName: 'Asigna la columna del apellido.',
    documentType: 'Asigna la columna del tipo de documento.',
    documentId: 'Asigna la columna del número de documento.',
  },
};

type Row = ImportRow<ContactImportRowDto, ImportField>;

@Injectable()
export class ContactImportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Todo o nada: valida cada fila y solo guarda si ninguna tiene errores. */
  async importCsv(file: UploadedCsv | undefined, rawMapping: string | undefined, ownerId: string) {
    const { mapping, rows } = await readImport(file, rawMapping, CONTACT_IMPORT);
    const companyIds = await this.checkReferences(rows);
    rejectInvalidRows(rows, mapping, IMPORT_FIELDS, 'ningún contacto');

    try {
      // createMany es una sola sentencia INSERT: o entran todas las filas o ninguna.
      const { count } = await this.prisma.contact.createMany({
        data: rows.map(({ value: { companyTaxId, ...fields } }) => ({
          ...fields,
          companyId: companyTaxId ? companyIds.get(companyTaxId) : null,
          ownerId,
        })),
      });
      return { imported: count };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'Otra persona registró uno de estos documentos mientras importabas. Vuelve a subir el archivo.',
        );
      }
      throw error;
    }
  }

  /** Documento único (en el archivo y en la base) y empresa existente por RUC. Devuelve el id de cada RUC. */
  private async checkReferences(rows: Row[]) {
    const firstRow = markDuplicates(rows, 'documentId', (first) => `El documento se repite en la fila ${first}.`);
    const valid = (row: Row, field: 'documentId' | 'companyTaxId') => (row.errors.has(field) ? null : row.value[field]);
    const taxIds = rows.map((row) => valid(row, 'companyTaxId')).filter((taxId): taxId is string => Boolean(taxId));
    const [existing, companies] = await Promise.all([
      this.prisma.contact.findMany({ where: { documentId: { in: [...firstRow.keys()] } }, select: { documentId: true } }),
      this.prisma.company.findMany({ where: { taxId: { in: taxIds } }, select: { id: true, taxId: true } }),
    ]);
    const taken = new Set(existing.map((contact) => contact.documentId));
    const companyIds = new Map(companies.map((company) => [company.taxId, company.id]));
    for (const row of rows) {
      const documentId = valid(row, 'documentId');
      if (documentId && taken.has(documentId)) row.errors.set('documentId', 'Ya existe un contacto con ese documento.');
      const taxId = valid(row, 'companyTaxId');
      if (taxId && !companyIds.has(taxId)) row.errors.set('companyTaxId', 'No existe una empresa con ese RUC.');
    }
    return companyIds;
  }
}
