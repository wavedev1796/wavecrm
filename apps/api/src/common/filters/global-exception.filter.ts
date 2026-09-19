import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

// Nest convierte el SyntaxError del body parser (JSON roto) y el URIError de una ruta mal
// codificada en un 400 con el texto técnico de V8/Express, en inglés.
// ponytail: se reconocen por esas palabras; si Nest o V8 cambian el texto, la prueba de JSON roto lo detecta.
const MALFORMED_REQUEST = /\bJSON\b|decode param/;

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status = statusOf(exception);
    response.status(status).json({
      error: { status, message: messageOf(exception, status), path: request.url, timestamp: new Date().toISOString() },
    });
  }
}

function statusOf(exception: unknown) {
  if (exception instanceof HttpException) return exception.getStatus();
  // El body parser rechaza los cuerpos de más de 100 KB con un error propio que Nest no convierte.
  return (exception as { type?: string } | null)?.type === 'entity.too.large'
    ? HttpStatus.PAYLOAD_TOO_LARGE
    : HttpStatus.INTERNAL_SERVER_ERROR;
}

function messageOf(exception: unknown, status: number): string | string[] {
  if (status === HttpStatus.PAYLOAD_TOO_LARGE) return 'La solicitud es demasiado grande.';
  if (!(exception instanceof HttpException)) return 'Ocurrió un error inesperado.';
  const payload = exception.getResponse();
  const message =
    typeof payload === 'object' && 'message' in payload
      ? (payload as { message: string | string[] }).message
      : exception.message;
  return typeof message === 'string' && MALFORMED_REQUEST.test(message)
    ? 'La solicitud no tiene un formato válido.'
    : message;
}
