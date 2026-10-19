import { applyDecorators } from "@nestjs/common";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ACTIVITY_TYPES,
  IVA_SUGGESTIONS,
  LOSS_REASONS,
  type ActivityType,
  type LossReason,
} from "@wave/shared";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
  isISO8601,
} from "class-validator";

const text = (label: string, max = 100, min = 1) =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === "string" ? value.trim() : value,
    ),
    IsString({ message: "Ingresa " + label + "." }),
    Length(min, max, {
      message:
        "Revisa " + label + ": entre " + min + " y " + max + " caracteres.",
    }),
  );
const numeric = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" && value.trim() ? Number(value) : value,
  );
const isoDate = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" && isISO8601(value, { strict: true })
      ? new Date(value)
      : value,
  );

const IVA_INVALID = "El IVA debe ser un porcentaje entero entre 0 y 100.";

export class CreatePipelineDto {
  @ApiProperty({ example: "Ventas Ecuador" })
  @text("el nombre", 100, 2)
  name!: string;
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean({ message: "Indica si el pipeline es principal con true o false." })
  isDefault?: boolean;
}
export class UpdatePipelineDto extends PartialType(CreatePipelineDto, {
  skipNullProperties: false,
}) {}
export class CreateStageDto {
  @ApiProperty() @text("el nombre de la etapa", 80, 2) name!: string;
  @ApiProperty()
  @numeric()
  @IsInt({ message: "La posicion debe ser un entero." })
  @Min(0)
  @Max(1000000)
  position!: number;
  @ApiProperty()
  @numeric()
  @IsInt()
  @Min(0, { message: "La probabilidad debe estar entre 0 y 100." })
  @Max(100, { message: "La probabilidad debe estar entre 0 y 100." })
  probability!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: "Elige un color valido." })
  color?: string;
}
export class UpdateStageDto extends PartialType(CreateStageDto, {
  skipNullProperties: false,
}) {}
export class CreateDealDto {
  @ApiProperty() @text("el nombre del negocio", 160, 2) title!: string;
  @ApiProperty()
  @numeric()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "Ingresa un monto valido con hasta dos decimales." },
  )
  @Min(0)
  @Max(999999999999.99)
  value!: number;
  @ApiProperty() @text("el pipeline") pipelineId!: string;
  @ApiProperty() @text("la etapa") stageId!: string;
  @ApiPropertyOptional() @IsOptional() @text("el contacto") contactId?:
    string | null;
  @ApiPropertyOptional() @IsOptional() @text("la empresa") companyId?:
    string | null;
  @ApiPropertyOptional() @IsOptional() @text("el responsable") ownerId?:
    string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @isoDate()
  @IsDate({ message: "Ingresa una fecha valida." })
  expectedClose?: Date | null;
}
export class UpdateDealDto extends PartialType(CreateDealDto, {
  skipNullProperties: false,
}) {}
export class MoveDealDto {
  @ApiProperty() @text("la etapa") stageId!: string;
}
export class WinDealDto {
  @ApiPropertyOptional({ example: "2026-10-10T00:00:00.000Z" })
  @IsOptional()
  @isoDate()
  @IsDate({ message: "Ingresa una fecha de ganado válida." })
  closedAt?: Date;
}
export class LoseDealDto {
  @ApiProperty({ enum: LOSS_REASONS })
  @IsIn([...LOSS_REASONS], { message: "Elige el motivo de la pérdida." })
  lossReason!: LossReason;
  @ApiPropertyOptional()
  @ValidateIf(
    (dto: LoseDealDto) => dto.lossReason === "OTHER" || dto.lossDetail != null,
  )
  @text("el detalle del motivo", 500, 2)
  lossDetail?: string;
}
export class DealItemDto {
  @ApiProperty({ example: "Pagina web corporativa" })
  @text("la descripción del producto", 200, 2)
  description!: string;
  @ApiProperty({ example: 1 })
  @numeric()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "Ingresa una cantidad con hasta dos decimales." },
  )
  @Min(0.01, { message: "La cantidad debe ser mayor que cero." })
  @Max(999999.99, { message: "La cantidad máxima es 999999.99." })
  quantity!: number;
  @ApiProperty({ example: 1400 })
  @numeric()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "Ingresa un precio válido con hasta dos decimales." },
  )
  @Min(0, { message: "El precio no puede ser negativo." })
  @Max(999999999999.99, { message: "El precio máximo es 999999999999.99." })
  unitPrice!: number;
  @ApiProperty({ example: IVA_SUGGESTIONS[0], minimum: 0, maximum: 100 })
  @numeric()
  @IsInt({ message: IVA_INVALID })
  @Min(0, { message: IVA_INVALID })
  @Max(100, { message: IVA_INVALID })
  taxRate!: number;
}
export class CreateDealActivityDto {
  @ApiProperty({ enum: ACTIVITY_TYPES })
  @IsIn([...ACTIVITY_TYPES], { message: "Elige el tipo de actividad." })
  type!: ActivityType;
  @ApiProperty({ example: "Llamar para confirmar la propuesta" })
  @text("el asunto", 160, 2)
  subject!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @isoDate()
  @IsDate({ message: "Ingresa una fecha válida." })
  dueAt?: Date;
  @ApiPropertyOptional()
  @IsOptional()
  @text("la nota", 1000)
  description?: string;
}
export class SaveDealItemsDto {
  @ApiProperty({ type: [DealItemDto] })
  @IsArray({ message: "Envía la lista de productos." })
  @ArrayMaxSize(100, { message: "Un negocio admite hasta 100 productos." })
  @ValidateNested({ each: true })
  @Type(() => DealItemDto)
  items!: DealItemDto[];
}
export class ListDealsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @text("el pipeline") pipelineId?: string;
  @ApiPropertyOptional() @IsOptional() @text("la etapa") stageId?: string;
  @ApiPropertyOptional() @IsOptional() @text("el responsable") ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @text("la busqueda") search?: string;
}
