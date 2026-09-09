import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : null;
    const message = typeof payload === 'object' && payload && 'message' in payload
      ? (payload as { message: string | string[] }).message
      : status === 500
        ? 'Ocurrió un error inesperado.'
        : exception instanceof Error
          ? exception.message
          : 'Solicitud inválida.';

    response.status(status).json({
      error: { status, message, path: request.url, timestamp: new Date().toISOString() },
    });
  }
}

