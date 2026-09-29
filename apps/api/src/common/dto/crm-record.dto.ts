import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";
import {
  IsCanton,
  IsContactEmail,
  IsPhone,
  IsProvince,
  IsTags,
} from "../validation";

const optionalId = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() || null : value,
  );

/** Campos de contacto, ubicación y asignación comunes a contactos y empresas. */
export abstract class CrmRecordDto {
  @ApiPropertyOptional({ example: "ventas@empresa.ec", nullable: true })
  @IsContactEmail()
  email?: string | null;

  @ApiPropertyOptional({
    description: "Se guarda en E.164; sin + se entiende que es de Ecuador.",
    example: "+593991234567",
    nullable: true,
  })
  @IsPhone()
  phone?: string | null;

  @ApiPropertyOptional({ example: "Pichincha", nullable: true })
  @IsProvince()
  province?: string | null;

  @ApiPropertyOptional({ example: "Quito", nullable: true })
  @IsCanton()
  city?: string | null;

  @ApiPropertyOptional({ example: ["cliente", "vip"], maxItems: 10 })
  @IsTags()
  tags?: string[];

  @ApiPropertyOptional({
    description: "Responsable; por defecto es quien crea el registro.",
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
