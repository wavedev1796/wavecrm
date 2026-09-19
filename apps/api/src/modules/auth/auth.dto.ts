import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsAccountEmail, IsLoginPassword } from '../../common/validation';

const INVALID_REFRESH = { message: 'El refresh token no es válido.' };

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
