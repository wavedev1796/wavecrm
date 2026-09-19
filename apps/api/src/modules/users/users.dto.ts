import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { UserRole } from "@wave/database";
import { Transform } from "class-transformer";
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { IsAccountEmail, IsNewPassword, IsPersonName } from "../../common/validation";

const INVALID_ROLE = { message: "Elige un rol válido." };
const CONFIRMATION_REQUIRED = { message: "Confirma tu contraseña." };

export class CreateUserDto {
  @ApiProperty({ example: "Ana López", minLength: 2, maxLength: 100 })
  @IsPersonName()
  name!: string;

  @ApiProperty({ example: "ana@empresa.ec", maxLength: 64 })
  @IsAccountEmail()
  email!: string;

  @ApiProperty({ enum: UserRole, default: UserRole.VENDEDOR })
  @IsEnum(UserRole, INVALID_ROLE)
  role!: UserRole;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class ListUsersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Busca por nombre o correo.", maxLength: 100 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @MaxLength(100, { message: "La búsqueda no puede superar 100 caracteres." })
  @IsString({ message: "La búsqueda debe ser un texto." })
  search?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole, INVALID_ROLE)
  role?: UserRole;

  @ApiPropertyOptional({ enum: ["active", "inactive", "pending"] })
  @IsOptional()
  @IsIn(["active", "inactive", "pending"], { message: "Elige un estado válido." })
  status?: "active" | "inactive" | "pending";
}

export class ActivateInvitationDto {
  @ApiProperty({ minLength: 8, maxLength: 16 })
  @IsNewPassword()
  password!: string;

  @ApiProperty()
  @IsNotEmpty(CONFIRMATION_REQUIRED)
  @IsString(CONFIRMATION_REQUIRED)
  passwordConfirmation!: string;
}
