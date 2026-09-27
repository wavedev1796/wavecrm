import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { MAX_IMPORT_ROWS } from './csv-import';

const MAX_FILE_BYTES = 1024 * 1024;

type Options = {
  path: string;
  summary: string;
  description: string;
  mappingDescription: string;
  mappingExample: string;
  missingColumn: string;
  conflict: string;
  rejected: { message: string; errors: { row: number; column: string; message: string }[] };
};

/** Multipart con `file` y `mapping`, límite de 1 MB y las seis respuestas documentadas. */
export function ApiCsvImport(options: Options) {
  const errorExample = (status: number, message: string, extra: object = {}) => ({
    error: { status, message, ...extra, path: options.path, timestamp: '2026-09-27T15:00:00.000Z' },
  });
  return applyDecorators(
    UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } })),
    ApiOperation({ summary: options.summary, description: options.description }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['file', 'mapping'],
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: `CSV separado por "," o ";" (UTF-8 o Windows-1252), máximo 1 MB y ${MAX_IMPORT_ROWS} filas.`,
          },
          mapping: { type: 'string', description: options.mappingDescription, example: options.mappingExample },
        },
      },
    }),
    ApiCreatedResponse({ description: 'Todas las filas eran válidas y se guardaron.', schema: { example: { imported: 2 } } }),
    ApiBadRequestResponse({
      description: 'Falta el archivo, no es .csv, está mal formado, vacío, supera las 1000 filas o el mapeo es inválido.',
      schema: { example: errorExample(400, options.missingColumn) },
    }),
    ApiUnauthorizedResponse({ description: 'Sin sesión o con el access token vencido.' }),
    ApiConflictResponse({
      description: 'Otra persona registró un identificador del archivo entre la validación y el guardado.',
      schema: { example: errorExample(409, options.conflict) },
    }),
    ApiPayloadTooLargeResponse({
      description: 'El archivo supera 1 MB.',
      schema: { example: errorExample(413, 'La solicitud es demasiado grande.') },
    }),
    ApiUnprocessableEntityResponse({
      description: 'Alguna fila tiene errores; no se guardó ninguna.',
      schema: { example: errorExample(422, options.rejected.message, { errors: options.rejected.errors }) },
    }),
  );
}
