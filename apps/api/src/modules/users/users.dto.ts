import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { UserRole } from "@wave/database";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateUserDto {
  @ApiProperty({ example: "Ana López" })
  @Transform(trimmed)
  @IsString()
  @IsNotEmpty({ message: "El nombre es obligatorio." })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: "ana@empresa.ec" })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: "El correo no es válido." })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ enum: UserRole, default: UserRole.VENDEDOR })
  @IsEnum(UserRole)
  role!: UserRole;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class ListUsersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Busca por nombre o correo." })
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: ["active", "inactive", "pending"] })
  @IsOptional()
  @IsIn(["active", "inactive", "pending"])
  status?: "active" | "inactive" | "pending";
}

export class ActivateInvitationDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres." })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: "La contraseña debe incluir al menos una letra y un número.",
  })
  password!: string;

  @ApiProperty()
  @IsString()
  passwordConfirmation!: string;
}
