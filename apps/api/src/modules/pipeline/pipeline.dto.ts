import { applyDecorators } from "@nestjs/common";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
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
  @Transform(({ value }: { value: unknown }) => typeof value === "string" && isISO8601(value, { strict: true }) ? new Date(value) : value)
  @IsDate({ message: "Ingresa una fecha valida." })
  expectedClose?: Date | null;
  @ApiPropertyOptional({ enum: ["OPEN", "WON", "LOST"] })
  @IsOptional()
  @IsIn(["OPEN", "WON", "LOST"])
  status?: "OPEN" | "WON" | "LOST";
}
export class UpdateDealDto extends PartialType(CreateDealDto, {
  skipNullProperties: false,
}) {}
export class MoveDealDto {
  @ApiProperty() @text("la etapa") stageId!: string;
}
export class ListDealsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @text("el pipeline") pipelineId?: string;
  @ApiPropertyOptional() @IsOptional() @text("la etapa") stageId?: string;
  @ApiPropertyOptional() @IsOptional() @text("el responsable") ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @text("la busqueda") search?: string;
}
