import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
import { IVA_INVALID } from "../pipeline/pipeline.dto";

export class UpdateSettingsDto {
  @ApiProperty({ minimum: 0, maximum: 100, example: 15, description: "IVA general por defecto" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim()) ? Number(value) : value,
  )
  @Min(0, { message: IVA_INVALID })
  @Max(100, { message: IVA_INVALID })
  @IsInt({ message: IVA_INVALID })
  taxRate!: number;
}
