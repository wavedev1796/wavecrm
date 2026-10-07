import { Body, Controller, Post, UploadedFile } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { UploadedCsv } from '../../common/csv-import';
import { ApiCsvImport } from '../../common/csv-import.swagger';
import { CurrentUser } from '../auth/auth.decorators';
import type { JwtPayload } from '../auth/auth.service';
import { IMPORT_FIELDS } from './contact-import.dto';
import { ContactImportService } from './contact-import.service';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactImportController {
  constructor(private readonly contactImport: ContactImportService) {}

  @Post('import')
  @ApiCsvImport({
    path: '/api/v1/contacts/import',
    summary: 'Importa contactos desde un CSV (todo o nada)',
    description:
      'Valida cada fila con las reglas de Ecuador (documento por tipo, teléfono, provincia, cantón, etiquetas), la unicidad del documento ' +
      'y que traiga al menos un teléfono o un correo. ' +
      'Si alguna fila falla no se guarda ninguna y el 422 lista fila, columna y motivo; la fila es la de la hoja de ' +
      'cálculo (la cabecera es la 1). El responsable de los contactos es quien importa. Disponible para ADMIN y VENDEDOR.',
    mappingDescription: `JSON { campo: cabecera del CSV }. Obligatorios firstName, lastName, documentType (Cédula, RUC o Pasaporte), documentId y al menos phone o email. Campos: ${IMPORT_FIELDS.join(', ')}. companyTaxId enlaza con una empresa ya registrada por su RUC; tags admite varias etiquetas separadas por comas.`,
    mappingExample:
      '{"firstName":"Nombre","lastName":"Apellido","documentType":"Tipo de documento","documentId":"Documento","phone":"Teléfono","province":"Provincia"}',
    missingColumn: 'Asigna la columna del apellido.',
    conflict: 'Otra persona registró uno de estos documentos mientras importabas. Vuelve a subir el archivo.',
    rejected: {
      message: 'No se importó ningún contacto: 1 fila tiene errores.',
      errors: [{ row: 3, column: 'Documento', message: 'La cédula no es válida.' }],
    },
  })
  importCsv(
    @UploadedFile() file: UploadedCsv | undefined,
    @Body('mapping') mapping: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.contactImport.importCsv(file, mapping, user.sub);
  }
}
