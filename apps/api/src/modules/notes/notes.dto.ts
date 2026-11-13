import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { cleanText } from "@wave/shared";
import { ArrayMaxSize, IsArray, IsOptional, IsString, Length } from "class-validator";

const MENTIONS = { message: "Elige hasta 20 miembros para mencionar." };

export class CreateNoteDto {
  @ApiProperty({ maxLength: 5000, example: "Pidió la propuesta con entrega en diciembre." })
  @Transform(({ value }) => (typeof value === "string" ? cleanText(value, true) : value))
  @IsString({ message: "Escribe la nota." })
  @Length(1, 5000, { message: "La nota debe tener entre 1 y 5000 caracteres." })
  content!: string;

  @ApiPropertyOptional({ type: [String], maxItems: 20, description: "Ids de miembros activos." })
  @IsOptional()
  @IsArray(MENTIONS)
  @ArrayMaxSize(20, MENTIONS)
  @IsString({ each: true, ...MENTIONS })
  mentionIds?: string[];
}

export class UpdateNoteDto extends PartialType(CreateNoteDto) {}
