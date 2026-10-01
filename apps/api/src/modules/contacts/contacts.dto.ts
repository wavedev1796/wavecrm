import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { CrmListQueryDto } from "../../common/dto/crm-list-query.dto";
import { CrmRecordDto } from "../../common/dto/crm-record.dto";
import { DOCUMENT_TYPES, type DocumentType } from "../../common/ecuador";
import {
  IsDocument,
  IsDocumentType,
  IsPersonName,
  IsPosition,
} from "../../common/validation";

const optionalId = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() || null : value,
  );

export class CreateContactDto extends CrmRecordDto {
  @ApiProperty({ example: "Ana", minLength: 2, maxLength: 100 })
  @IsPersonName()
  firstName!: string;

  @ApiProperty({ example: "López", minLength: 2, maxLength: 100 })
  @IsPersonName("apellido")
  lastName!: string;

  @ApiProperty({
    enum: DOCUMENT_TYPES,
    description: "Tipo del documento, obligatorio; va siempre junto con documentId.",
    example: "CEDULA",
  })
  @IsDocumentType()
  documentType!: DocumentType;

  @ApiProperty({
    description:
      "Cédula (10 dígitos), RUC de persona natural (13) o pasaporte (6 a 20 letras o números). Obligatorio y único; en un PATCH se puede cambiar, no borrar.",
    example: "1712345675",
  })
  @IsDocument()
  documentId!: string;

  @ApiPropertyOptional({ example: "Gerente comercial", nullable: true })
  @IsPosition()
  position?: string | null;

  @ApiPropertyOptional({
    description: "Empresa relacionada; vacío la desvincula.",
    nullable: true,
  })
  @IsOptional()
  @optionalId()
  @IsString({ message: "La empresa debe ser un identificador válido." })
  @MaxLength(100, { message: "La empresa debe ser un identificador válido." })
  companyId?: string | null;

}

export class UpdateContactDto extends PartialType(CreateContactDto) {}

export class ListContactsDto extends CrmListQueryDto {}
