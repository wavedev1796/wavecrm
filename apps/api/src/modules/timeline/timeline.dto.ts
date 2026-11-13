import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

const INVALID_LIMIT = { message: "El límite debe ser un número entero entre 1 y 50." };

export class TimelineQueryDto {
  @ApiPropertyOptional({ description: "Valor de `meta.nextCursor` de la página anterior." })
  @IsOptional()
  @IsString({ message: "El cursor no es válido." })
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt(INVALID_LIMIT)
  @Min(1, INVALID_LIMIT)
  @Max(50, INVALID_LIMIT)
  limit = 20;
}
