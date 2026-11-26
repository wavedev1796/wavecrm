import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsInt, Max, Min } from "class-validator";
import { TAX_CODES } from "@wave/shared";
import { IVA_INVALID } from "../pipeline/pipeline.dto";

export const IVA_SIN_CODIGO = "Elige un IVA que Wave Billing acepte: 15, 8, 5 o 0.";

export class UpdateSettingsDto {
  @ApiProperty({ minimum: 0, maximum: 100, example: 15, description: "IVA general por defecto; solo una tarifa con código de Wave Billing (15, 8, 5 o 0)" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim()) ? Number(value) : value,
  )
  @IsIn(Object.keys(TAX_CODES).map(Number), { message: IVA_SIN_CODIGO })
  @Min(0, { message: IVA_INVALID })
  @Max(100, { message: IVA_INVALID })
  @IsInt({ message: IVA_INVALID })
  taxRate!: number;
}
