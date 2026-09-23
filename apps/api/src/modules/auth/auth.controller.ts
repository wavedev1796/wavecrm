import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser, Public } from './auth.decorators';
import { ForgotPasswordDto, LoginDto, RefreshTokenDto, ResetPasswordDto } from './auth.dto';
import { AuthService, JwtPayload } from './auth.service';

/** Misma respuesta exista o no la cuenta: el formulario no puede servir para descubrir correos. */
const FORGOT_PASSWORD_RESPONSE = {
  message: 'Si el correo pertenece a una cuenta activa, enviaremos el enlace en unos segundos.',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Inicia sesión y devuelve access + refresh token' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renueva los tokens con el refresh token (rotación)' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cierra la sesión revocando el refresh token vigente' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Envía el enlace para crear una contraseña nueva' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(dto.email);
    return FORGOT_PASSWORD_RESPONSE;
  }

  @Public()
  @Get('password-resets/:token')
  @ApiOperation({ summary: 'Valida un enlace de recuperación y devuelve sus datos públicos' })
  passwordReset(@Param('token') token: string) {
    return this.authService.passwordReset(token);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('password-resets/:token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Guarda la contraseña nueva y cierra las sesiones abiertas' })
  resetPassword(@Param('token') token: string, @Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(token, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Devuelve el usuario autenticado' })
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }
}
