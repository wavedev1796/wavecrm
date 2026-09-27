import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@wave/database';
import { markDuplicates, readImport, rejectInvalidRows, type ImportRow, type UploadedCsv } from '../../common/csv-import';
import { PrismaService } from '../prisma/prisma.service';
import { COMPANY_IMPORT_FIELDS, CompanyImportRowDto, type CompanyImportField } from './company-import.dto';

const COMPANY_IMPORT = {
  dto: CompanyImportRowDto,
  fields: COMPANY_IMPORT_FIELDS,
  required: { name: 'Asigna la columna del nombre.', taxId: 'Asigna la columna del RUC.' },
};

@Injectable()
export class CompanyImportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Todo o nada, como la importación de contactos. */
  async importCsv(file: UploadedCsv | undefined, rawMapping: string | undefined, ownerId: string) {
    const { mapping, rows } = await readImport(file, rawMapping, COMPANY_IMPORT);
    await this.checkTaxIds(rows);
    rejectInvalidRows(rows, mapping, COMPANY_IMPORT_FIELDS, 'ninguna empresa');

    try {
      // createMany es una sola sentencia INSERT: o entran todas las filas o ninguna.
      const { count } = await this.prisma.company.createMany({ data: rows.map(({ value }) => ({ ...value, ownerId })) });
      return { imported: count };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Otra persona registró uno de estos RUC mientras importabas. Vuelve a subir el archivo.');
      }
      throw error;
    }
  }

  /** RUC único en el archivo y en la base. */
  private async checkTaxIds(rows: ImportRow<CompanyImportRowDto, CompanyImportField>[]) {
    const firstRow = markDuplicates(rows, 'taxId', (first) => `El RUC se repite en la fila ${first}.`);
    const existing = await this.prisma.company.findMany({
      where: { taxId: { in: [...firstRow.keys()] } },
      select: { taxId: true },
    });
    const taken = new Set(existing.map((company) => company.taxId));
    for (const row of rows) {
      if (!row.errors.has('taxId') && taken.has(row.value.taxId)) {
        row.errors.set('taxId', 'Ya existe una empresa con ese RUC.');
      }
    }
  }
}
