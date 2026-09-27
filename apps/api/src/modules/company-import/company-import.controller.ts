import { Body, Controller, Post, UploadedFile } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { UploadedCsv } from '../../common/csv-import';
import { ApiCsvImport } from '../../common/csv-import.swagger';
import { CurrentUser } from '../auth/auth.decorators';
import type { JwtPayload } from '../auth/auth.service';
import { COMPANY_IMPORT_FIELDS } from './company-import.dto';
import { CompanyImportService } from './company-import.service';

@ApiTags('companies')
@ApiBearerAuth()
@Controller('companies')
export class CompanyImportController {
  constructor(private readonly companyImport: CompanyImportService) {}

  @Post('import')
  @ApiCsvImport({
    path: '/api/v1/companies/import',
    summary: 'Importa empresas desde un CSV (todo o nada)',
    description:
      'Valida cada fila con las reglas del alta de empresa (nombre, RUC obligatorio y válido, teléfono, provincia, ' +
      'etiquetas) y la unicidad del RUC. Si alguna fila falla no se guarda ninguna y el 422 lista fila, columna y ' +
      'motivo. El responsable de las empresas es quien importa. Disponible para ADMIN y VENDEDOR.',
    mappingDescription: `JSON { campo: cabecera del CSV }. Obligatorios name y taxId. Campos: ${COMPANY_IMPORT_FIELDS.join(', ')}. tags admite varias etiquetas separadas por comas.`,
    mappingExample: '{"name":"Nombre","legalName":"Razón social","taxId":"RUC","phone":"Teléfono","province":"Provincia"}',
    missingColumn: 'Asigna la columna del RUC.',
    conflict: 'Otra persona registró uno de estos RUC mientras importabas. Vuelve a subir el archivo.',
    rejected: {
      message: 'No se importó ninguna empresa: 1 fila tiene errores.',
      errors: [{ row: 3, column: 'RUC', message: 'Ya existe una empresa con ese RUC.' }],
    },
  })
  importCsv(
    @UploadedFile() file: UploadedCsv | undefined,
    @Body('mapping') mapping: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.companyImport.importCsv(file, mapping, user.sub);
  }
}
