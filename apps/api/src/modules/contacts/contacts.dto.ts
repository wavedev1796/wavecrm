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

  @ApiPropertyOptional({
    enum: DOCUMENT_TYPES,
    nullable: true,
    description: "Tipo del documento; va siempre junto con documentId.",
    example: "CEDULA",
  })
  @IsDocumentType()
  documentType?: DocumentType | null;

  @ApiPropertyOptional({
    description:
      "Cédula (10 dígitos), RUC de persona natural (13) o pasaporte (6 a 20 letras o números). Único; vacío lo borra junto con el tipo.",
    example: "1712345675",
    nullable: true,
  })
  @IsDocument()
  documentId?: string | null;

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
