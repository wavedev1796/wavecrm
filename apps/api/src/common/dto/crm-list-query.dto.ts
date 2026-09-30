import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { IsProvince } from "../validation";
import { PaginationDto } from "./pagination.dto";

const trimmed = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  );

export class CrmListQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Texto por el que se filtran los resultados.",
    maxLength: 100,
  })
  @IsOptional()
  @trimmed()
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
  @trimmed()
  @IsString({ message: "El responsable debe ser un identificador válido." })
  @MaxLength(100, {
    message: "El responsable debe ser un identificador válido.",
  })
  ownerId?: string;
}
