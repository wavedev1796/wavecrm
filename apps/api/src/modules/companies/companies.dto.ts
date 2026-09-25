import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
} from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import {
  IsCity,
  IsContactEmail,
  IsEcuadorPhone,
  IsProvince,
  IsRuc,
  IsTags,
} from "../../common/validation";

const COMPANY_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} &'’.,()/-]*$/u;

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;

const normalized = () =>
  Transform(({ value }: { value: unknown }) => normalizeText(value));

const optionalText = () =>
  Transform(({ value }: { value: unknown }) => {
    const normalizedValue = normalizeText(value);
    return normalizedValue === "" ? null : normalizedValue;
  });

const companyNameDecorators = {
  message:
    "El nombre solo puede tener letras, números y signos comerciales comunes.",
};

export class CreateCompanyDto {
  @ApiProperty({ example: "Wave Comercial", minLength: 2, maxLength: 120 })
  @normalized()
  @IsString({ message: "Ingresa el nombre." })
  @Length(2, 120, { message: "El nombre debe tener entre 2 y 120 caracteres." })
  @Matches(COMPANY_NAME_PATTERN, companyNameDecorators)
  name!: string;

  @ApiPropertyOptional({ example: "Wave Comercial S.A.", nullable: true })
  @IsOptional()
  @optionalText()
  @IsString({ message: "La razón social debe ser un texto." })
  @MaxLength(160, {
    message: "La razón social no puede superar 160 caracteres.",
  })
  @Matches(COMPANY_NAME_PATTERN, companyNameDecorators)
  legalName?: string | null;

  @ApiPropertyOptional({
    description: "RUC ecuatoriano único.",
    example: "1791234561001",
    nullable: true,
  })
  @IsRuc()
  taxId?: string | null;

  @ApiPropertyOptional({ example: "https://wave.ec", nullable: true })
  @IsOptional()
  @optionalText()
  @IsUrl(
    { protocols: ["http", "https"], require_protocol: true },
    { message: "Escribe un sitio web válido con http:// o https://." },
  )
  @MaxLength(200, { message: "El sitio web no puede superar 200 caracteres." })
  website?: string | null;

  @ApiPropertyOptional({ example: "+59322345678", nullable: true })
  @IsEcuadorPhone()
  phone?: string | null;

  @ApiPropertyOptional({ example: "ventas@wave.ec", nullable: true })
  @IsContactEmail()
  email?: string | null;

  @ApiPropertyOptional({ example: "Pichincha", nullable: true })
  @IsProvince()
  province?: string | null;

  @ApiPropertyOptional({ example: "Quito", nullable: true })
  @IsCity()
  city?: string | null;

  @ApiPropertyOptional({ example: "Av. República 123", nullable: true })
  @IsOptional()
  @optionalText()
  @IsString({ message: "La dirección debe ser un texto." })
  @MaxLength(200, { message: "La dirección no puede superar 200 caracteres." })
  address?: string | null;

  @ApiPropertyOptional({ example: ["cliente", "distribuidor"], maxItems: 10 })
  @IsTags()
  tags?: string[];

  @ApiPropertyOptional({
    description: "Responsable; por defecto es quien crea la empresa.",
    nullable: true,
  })
  @IsOptional()
  @optionalText()
  @IsString({ message: "El responsable debe ser un identificador válido." })
  @MaxLength(100, {
    message: "El responsable debe ser un identificador válido.",
  })
  ownerId?: string | null;
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}

export class ListCompaniesDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Busca por nombre comercial, razón social o RUC.",
    maxLength: 100,
  })
  @IsOptional()
  @normalized()
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
  @normalized()
  @IsString({ message: "El responsable debe ser un identificador válido." })
  @MaxLength(100, {
    message: "El responsable debe ser un identificador válido.",
  })
  ownerId?: string;
}
