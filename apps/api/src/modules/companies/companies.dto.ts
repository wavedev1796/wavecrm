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
import { CrmListQueryDto } from "../../common/dto/crm-list-query.dto";
import { CrmRecordDto } from "../../common/dto/crm-record.dto";
import {
  IsRequiredRuc,
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

export class CreateCompanyDto extends CrmRecordDto {
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

  @ApiProperty({
    description: "RUC ecuatoriano único y obligatorio.",
    example: "1791234561001",
  })
  @IsRequiredRuc()
  taxId!: string;

  @ApiPropertyOptional({ example: "https://wave.ec", nullable: true })
  @IsOptional()
  @optionalText()
  @IsUrl(
    { protocols: ["http", "https"], require_protocol: true },
    { message: "Escribe un sitio web válido con http:// o https://." },
  )
  @MaxLength(200, { message: "El sitio web no puede superar 200 caracteres." })
  website?: string | null;

  @ApiPropertyOptional({ example: "Av. República 123", nullable: true })
  @IsOptional()
  @optionalText()
  @IsString({ message: "La dirección debe ser un texto." })
  @MaxLength(200, { message: "La dirección no puede superar 200 caracteres." })
  address?: string | null;

}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}

export class ListCompaniesDto extends CrmListQueryDto {}
