import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { MailerModule } from '../mailer/mailer.module';
import { AuthController } from './auth.controller';
import { JwtAuthGuard, throttleKey, RolesGuard } from './auth.guards';
import { AuthService } from './auth.service';

@Module({
  imports: [
    MailerModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
    // ponytail: el límite solo aplica a los endpoints con ThrottlerGuard (login y recuperación).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 5 }],
      getTracker: throttleKey,
      errorMessage: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
