import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsAccountEmail, IsLoginPassword, IsNewPassword } from '../../common/validation';

const INVALID_REFRESH = { message: 'El refresh token no es válido.' };
const CONFIRMATION_REQUIRED = { message: 'Confirma tu contraseña.' };

export class LoginDto {
  @ApiProperty({ example: 'eduardo@thewavesea.com', maxLength: 64 })
  @IsAccountEmail()
  email!: string;

  @ApiProperty({ example: 'Wave2026!', maxLength: 16 })
  @IsLoginPassword()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @MaxLength(2048, INVALID_REFRESH)
  @IsNotEmpty(INVALID_REFRESH)
  @IsString(INVALID_REFRESH)
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'ana@empresa.ec', maxLength: 64 })
  @IsAccountEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ minLength: 8, maxLength: 16 })
  @IsNewPassword()
  password!: string;

  @ApiProperty()
  @IsNotEmpty(CONFIRMATION_REQUIRED)
  @IsString(CONFIRMATION_REQUIRED)
  passwordConfirmation!: string;
}
