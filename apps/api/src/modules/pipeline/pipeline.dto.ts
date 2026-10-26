import { applyDecorators } from "@nestjs/common";
import { PaginationDto } from "../../common/dto/pagination.dto";
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  PickType,
} from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ACTIVITY_TYPES,
  DEAL_STATUSES,
  IVA_SUGGESTIONS,
  LOSS_REASONS,
  REJECTION_REASONS,
  STAGE_REQUIREMENTS,
  type ActivityType,
  type DealStatus,
  type LossReason,
  type StageRequirement,
} from "@wave/shared";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
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
const REQUIREMENTS_INVALID = "Elige requisitos válidos y sin repetir.";

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
  @ApiPropertyOptional({ enum: STAGE_REQUIREMENTS, isArray: true, description: "Requisitos para entrar a la etapa" })
  @IsOptional()
  @IsArray({ message: REQUIREMENTS_INVALID })
  @ArrayUnique({ message: REQUIREMENTS_INVALID })
  @IsIn([...STAGE_REQUIREMENTS], { each: true, message: REQUIREMENTS_INVALID })
  requirements?: StageRequirement[];
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
  @ApiPropertyOptional({ description: "Necesidad del cliente" })
  @IsOptional()
  @text("la necesidad", 2000, 2)
  need?: string | null;
  @ApiPropertyOptional({ description: "Solución de interés" })
  @IsOptional()
  @text("la solución", 2000, 2)
  solution?: string | null;
  @ApiPropertyOptional({ description: "Presupuesto evaluado (USD)" })
  @IsOptional()
  @numeric()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "Ingresa un presupuesto válido de hasta 999999999999.99." },
  )
  @Min(0, { message: "Ingresa un presupuesto válido de hasta 999999999999.99." })
  @Max(999999999999.99, {
    message: "Ingresa un presupuesto válido de hasta 999999999999.99.",
  })
  budget?: number | null;
  @ApiPropertyOptional({ description: "Por qué el presupuesto aún no se conoce" })
  @IsOptional()
  @text("la justificación del presupuesto", 1000, 2)
  budgetNote?: string | null;
  @ApiPropertyOptional({ description: "Persona decisora" })
  @IsOptional()
  @text("la persona decisora", 160, 2)
  decisionMaker?: string | null;
}
export class UpdateDealDto extends PartialType(CreateDealDto, {
  skipNullProperties: false,
}) {}
const reason = () => text("el motivo", 500, 2);
/** Etapa que la persona veía: si ya cambió, el API responde 409 en vez de pisar el cambio de otro. */
class FromStageDto {
  @ApiPropertyOptional() @IsOptional() @text("la etapa de origen") fromStageId?: string;
}
export class MoveDealDto extends FromStageDto {
  @ApiProperty() @text("la etapa") stageId!: string;
  @ApiPropertyOptional({ description: "Obligatorio al retroceder o reabrir" })
  @IsOptional()
  @reason()
  reason?: string;
  @ApiPropertyOptional({ description: "Fecha real de cierre al mover a una etapa de 100 %" })
  @IsOptional()
  @isoDate()
  @IsDate({ message: "Ingresa la fecha real de cierre." })
  closedAt?: Date;
}
export class WinDealDto extends FromStageDto {
  @ApiProperty({ example: "2026-10-10T00:00:00.000Z" })
  @isoDate()
  @IsDate({ message: "Ingresa la fecha real de cierre." })
  closedAt!: Date;
}
export class ReopenDealDto {
  @ApiProperty() @reason() reason!: string;
}
export class TransitionQueryDto {
  @ApiProperty({ description: "Id de etapa, WON, LOST, REJECTED o REOPEN" })
  @text("el destino")
  to!: string;
}
/** Detalle del motivo de un cierre: obligatorio con «Otro». */
const closeDetail = () =>
  applyDecorators(
    ApiPropertyOptional(),
    ValidateIf(
      (dto: { lossReason?: string; lossDetail?: unknown }) =>
        dto.lossReason === "OTHER" || dto.lossDetail != null,
    ),
    text("el detalle del motivo", 500, 2),
  );
/** Seguimiento opcional de un perdido: queda como actividad pendiente del negocio. */
export class FollowUpDto {
  @ApiProperty({ enum: ACTIVITY_TYPES })
  @IsIn([...ACTIVITY_TYPES], { message: "Elige el tipo del seguimiento." })
  type!: ActivityType;
  @ApiProperty({ example: "Retomar la propuesta" })
  @text("el asunto del seguimiento", 160, 2)
  subject!: string;
  @ApiProperty({ example: "2027-01-25" })
  @isoDate()
  @IsDate({ message: "Ingresa la fecha del seguimiento." })
  dueAt!: Date;
}
export class LoseDealDto extends FromStageDto {
  @ApiProperty({ enum: LOSS_REASONS })
  @IsIn([...LOSS_REASONS], { message: "Elige el motivo de la pérdida." })
  lossReason!: LossReason;
  @closeDetail() lossDetail?: string;
  @ApiPropertyOptional({ type: FollowUpDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FollowUpDto)
  followUp?: FollowUpDto;
}
export class RejectDealDto extends FromStageDto {
  @ApiProperty({ enum: REJECTION_REASONS })
  @IsIn([...REJECTION_REASONS], { message: "Elige el motivo del rechazo." })
  lossReason!: LossReason;
  @closeDetail() lossDetail?: string;
}
const IDS_INVALID = "Elige entre 1 y 100 negocios, sin repetir.";
export class DeleteDealsDto {
  @ApiProperty({ type: [String] })
  @IsArray({ message: IDS_INVALID })
  @ArrayMinSize(1, { message: IDS_INVALID })
  @ArrayMaxSize(100, { message: IDS_INVALID })
  @ArrayUnique({ message: IDS_INVALID })
  @IsString({ each: true, message: IDS_INVALID })
  ids!: string[];
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
  @ApiPropertyOptional({ description: "Con fecha, la actividad se registra como ya realizada" })
  @IsOptional()
  @isoDate()
  @IsDate({ message: "Ingresa una fecha válida." })
  completedAt?: Date;
}
export class CreateQuoteDto {
  @ApiProperty({ example: "2026-11-30" })
  @isoDate()
  @IsDate({ message: "Ingresa la vigencia de la propuesta." })
  validUntil!: Date;
  @ApiPropertyOptional({ description: "Por defecto, hoy" })
  @IsOptional()
  @isoDate()
  @IsDate({ message: "Ingresa una fecha de envío válida." })
  sentAt?: Date;
}
export class AcceptQuoteDto {
  @ApiProperty({ example: "2026-10-20" })
  @isoDate()
  @IsDate({ message: "Ingresa la fecha de aceptación." })
  acceptedAt!: Date;
  @ApiProperty({ example: "Orden de compra 55 recibida por correo" })
  @text("la evidencia de aceptación", 500, 2)
  acceptanceNote!: string;
}
export class SaveDealItemsDto {
  @ApiProperty({ type: [DealItemDto] })
  @IsArray({ message: "Envía la lista de productos." })
  @ArrayMaxSize(100, { message: "Un negocio admite hasta 100 productos." })
  @ValidateNested({ each: true })
  @Type(() => DealItemDto)
  items!: DealItemDto[];
}
export class BoardQueryDto extends PickType(PaginationDto, ["page"] as const) {
  @ApiPropertyOptional()
  @ValidateIf(
    (query: BoardQueryDto) =>
      query.column !== undefined || query.pipelineId !== undefined,
  )
  @text("el pipeline")
  pipelineId?: string;
  @ApiPropertyOptional({ description: "Id de etapa o LOST: trae solo esa columna, por páginas" })
  @IsOptional()
  @text("la columna")
  column?: string;
}
export class ListDealsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @text("el pipeline") pipelineId?: string;
  @ApiPropertyOptional() @IsOptional() @text("la etapa") stageId?: string;
  @ApiPropertyOptional() @IsOptional() @text("el responsable") ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @text("la busqueda") search?: string;
  @ApiPropertyOptional({ enum: DEAL_STATUSES, description: "REJECTED: la papelera" })
  @IsOptional()
  @IsIn([...DEAL_STATUSES], { message: "Elige un estado válido." })
  status?: DealStatus;
}
