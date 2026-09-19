import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

const INVALID_PAGE = { message: 'La página debe ser un número entero mayor que 0.' };
const INVALID_LIMIT = { message: 'El límite debe ser un número entero entre 1 y 100.' };

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt(INVALID_PAGE)
  @Min(1, INVALID_PAGE)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt(INVALID_LIMIT)
  @Min(1, INVALID_LIMIT)
  @Max(100, INVALID_LIMIT)
  limit = 20;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

