import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import {
  IsCedula,
  IsCity,
  IsContactEmail,
  IsEcuadorPhone,
  IsPersonName,
  IsPosition,
  IsProvince,
  IsTags,
} from "../../common/validation";

const optionalId = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() || null : value,
  );

const searchText = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  );

export class CreateContactDto {
  @ApiProperty({ example: "Ana", minLength: 2, maxLength: 100 })
  @IsPersonName()
  firstName!: string;

  @ApiProperty({ example: "López", minLength: 2, maxLength: 100 })
  @IsPersonName("apellido")
  lastName!: string;

  @ApiPropertyOptional({ example: "ana@empresa.ec", nullable: true })
  @IsContactEmail()
  email?: string | null;

  @ApiPropertyOptional({ example: "+593991234567", nullable: true })
  @IsEcuadorPhone()
  phone?: string | null;

  @ApiPropertyOptional({
    description: "Cédula ecuatoriana única.",
    example: "1712345675",
    nullable: true,
  })
  @IsCedula()
  documentId?: string | null;

  @ApiPropertyOptional({ example: "Pichincha", nullable: true })
  @IsProvince()
  province?: string | null;

  @ApiPropertyOptional({ example: "Quito", nullable: true })
  @IsCity()
  city?: string | null;

  @ApiPropertyOptional({ example: "Gerente comercial", nullable: true })
  @IsPosition()
  position?: string | null;

  @ApiPropertyOptional({ example: ["cliente", "vip"], maxItems: 10 })
  @IsTags()
  tags?: string[];

  @ApiPropertyOptional({
    description: "Empresa relacionada; vacío la desvincula.",
    nullable: true,
  })
  @IsOptional()
  @optionalId()
  @IsString({ message: "La empresa debe ser un identificador válido." })
  @MaxLength(100, { message: "La empresa debe ser un identificador válido." })
  companyId?: string | null;

  @ApiPropertyOptional({
    description: "Responsable; por defecto es quien crea el contacto.",
    nullable: true,
  })
  @IsOptional()
  @optionalId()
  @IsString({ message: "El responsable debe ser un identificador válido." })
  @MaxLength(100, {
    message: "El responsable debe ser un identificador válido.",
  })
  ownerId?: string | null;
}

export class UpdateContactDto extends PartialType(CreateContactDto) {}

export class ListContactsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Busca por nombre, apellido, cédula, empresa o RUC.",
    maxLength: 100,
  })
  @IsOptional()
  @searchText()
  @IsString({ message: "La búsqueda debe ser un texto." })
  @MaxLength(100, { message: "La búsqueda no puede superar 100 caracteres." })
  search?: string;

  @ApiPropertyOptional({
    description: "Nombre oficial de una provincia de Ecuador.",
  })
  @IsProvince()
  province?: string | null;

  @ApiPropertyOptional({
    description: "Etiqueta exacta; se normaliza a minúsculas.",
    maxLength: 30,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: "La etiqueta debe ser un texto." })
  @MaxLength(30, { message: "La etiqueta no puede superar 30 caracteres." })
  tag?: string;

  @ApiPropertyOptional({ description: "Identificador del responsable." })
  @IsOptional()
  @searchText()
  @IsString({ message: "El responsable debe ser un identificador válido." })
  @MaxLength(100, {
    message: "El responsable debe ser un identificador válido.",
  })
  ownerId?: string;
}
