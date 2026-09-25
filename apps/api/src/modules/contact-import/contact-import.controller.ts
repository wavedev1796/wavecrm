import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/auth.decorators';
import type { JwtPayload } from '../auth/auth.service';
import { IMPORT_FIELDS } from './contact-import.dto';
import { ContactImportService, MAX_IMPORT_ROWS, type UploadedCsv } from './contact-import.service';

const MAX_FILE_BYTES = 1024 * 1024;

/** Ejemplo del formato de error global para Swagger. */
const errorExample = (status: number, message: string, extra: object = {}) => ({
  error: { status, message, ...extra, path: '/api/v1/contacts/import', timestamp: '2026-09-24T15:00:00.000Z' },
});

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactImportController {
  constructor(private readonly contactImport: ContactImportService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }))
  @ApiOperation({
    summary: 'Importa contactos desde un CSV (todo o nada)',
    description:
      'Valida cada fila con las reglas de Ecuador (cédula, teléfono, provincia, etiquetas) y la unicidad de la cédula. ' +
      'Si alguna fila falla no se guarda ninguna y el 422 lista fila, columna y motivo; la fila es la de la hoja de ' +
      'cálculo (la cabecera es la 1). El responsable de los contactos es quien importa. Disponible para ADMIN y VENDEDOR.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'mapping'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: `CSV separado por "," o ";" (UTF-8 o Windows-1252), máximo 1 MB y ${MAX_IMPORT_ROWS} filas.`,
        },
        mapping: {
          type: 'string',
          description: `JSON { campo: cabecera del CSV }. Obligatorios firstName y lastName. Campos: ${IMPORT_FIELDS.join(', ')}. companyTaxId enlaza con una empresa ya registrada por su RUC; tags admite varias etiquetas separadas por comas.`,
          example: '{"firstName":"Nombre","lastName":"Apellido","documentId":"Cédula","phone":"Teléfono","province":"Provincia"}',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Todas las filas eran válidas y se guardaron.', schema: { example: { imported: 2 } } })
  @ApiBadRequestResponse({
    description: 'Falta el archivo, no es .csv, está mal formado, vacío, supera las 1000 filas o el mapeo es inválido.',
    schema: { example: errorExample(400, 'Asigna la columna del apellido.') },
  })
  @ApiUnauthorizedResponse({ description: 'Sin sesión o con el access token vencido.' })
  @ApiConflictResponse({
    description: 'Otra persona registró una de las cédulas entre la validación y el guardado.',
    schema: {
      example: errorExample(409, 'Otra persona registró una de estas cédulas mientras importabas. Vuelve a subir el archivo.'),
    },
  })
  @ApiPayloadTooLargeResponse({
    description: 'El archivo supera 1 MB.',
    schema: { example: errorExample(413, 'La solicitud es demasiado grande.') },
  })
  @ApiUnprocessableEntityResponse({
    description: 'Alguna fila tiene errores; no se guardó ninguna.',
    schema: {
      example: errorExample(422, 'No se importó ningún contacto: 1 fila tiene errores.', {
        errors: [{ row: 3, column: 'Cédula', message: 'La cédula no es válida.' }],
      }),
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
