import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'eduardo@thewavesea.com' })
  @IsEmail({}, { message: 'El correo no es válido.' })
  email!: string;

  @ApiProperty({ example: 'contraseña' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'El refresh token es obligatorio.' })
  refreshToken!: string;
}
