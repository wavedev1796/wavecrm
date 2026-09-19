import { BadRequestException, INestApplication, ValidationError, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

/** Configuración HTTP compartida por `main.ts` y las pruebas de integración. */
export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  // Sin credentials: el API autentica con Bearer y la web lo llama desde el servidor,
  // así que ningún navegador necesita enviarle cookies desde otro origen.
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',').map((origin) => origin.trim()),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
      exceptionFactory: validationException,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
}

/** Un mensaje por campo y en español: class-validator redacta en inglés el de campo no permitido. */
export function validationException(errors: ValidationError[]) {
  return new BadRequestException(
    errors.map((error) =>
      error.constraints?.whitelistValidation
        ? `El campo «${error.property}» no está permitido.`
        : (Object.values(error.constraints ?? {})[0] ?? 'Solicitud inválida.'),
    ),
  );
}
