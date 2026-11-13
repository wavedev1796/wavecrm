import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ACTIVITY_TYPES, cleanText, type ActivityType } from "@wave/shared";
import {
  IsDate,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from "class-validator";

const text = (label: string, max: number, min = 1) =>
  applyDecorators(
    Transform(({ value }) =>
      typeof value === "string" ? cleanText(value) : value,
    ),
    IsString({ message: `Ingresa ${label}.` }),
    Length(min, max, {
      message: `Revisa ${label}: entre ${min} y ${max} caracteres.`,
    }),
  );

/**
 * Fecha de una actividad (agenda y ficha del negocio). Un día sin hora ("2026-11-05") es las 00:00 de
 * Ecuador, no de UTC: así la agenda, la ficha y el timeline lo muestran el mismo día.
 */
export const activityDate = (message: string) =>
  applyDecorators(
    Transform(({ value }) => {
      if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)
      )
        return value;
      // ponytail: Ecuador continental está en UTC-5 todo el año (sin horario de verano).
      const parsed = new Date(value.length === 10 ? `${value}T00:00:00-05:00` : value);
      return Number.isNaN(parsed.getTime()) ? value : parsed;
    }),
    IsDate({ message }),
  );
const date = (label: string) => activityDate(`Ingresa ${label} válido.`);

export class CreateActivityDto {
  @ApiProperty({ enum: ACTIVITY_TYPES })
  @IsIn([...ACTIVITY_TYPES], { message: "Elige un tipo de actividad válido." })
  type!: ActivityType;

  @ApiProperty({ example: "Llamar para dar seguimiento" })
  @text("el asunto", 160, 2)
  subject!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @text("la descripción", 1000)
  description?: string;

  @ApiPropertyOptional({ example: "2026-11-05T15:00:00.000Z" })
  @IsOptional()
  @date("la fecha de vencimiento")
  dueAt?: Date;

  @ApiPropertyOptional({ example: "2026-11-05T14:30:00.000Z" })
  @IsOptional()
  @date("la fecha del recordatorio")
  reminderAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^c[a-z0-9]{20,30}$/i, { message: "El responsable no es válido." })
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^c[a-z0-9]{20,30}$/i, { message: "El contacto no es válido." })
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^c[a-z0-9]{20,30}$/i, { message: "La empresa no es válida." })
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^c[a-z0-9]{20,30}$/i, { message: "El negocio no es válido." })
  dealId?: string;
}

export class UpdateActivityDto extends PartialType(CreateActivityDto) {
  @ApiPropertyOptional({ format: "date-time", description: "Versión leída por el formulario" })
  @IsOptional()
  @date("la versión de la actividad")
  updatedAt?: Date;
}

export class ListActivitiesDto {
  @ApiPropertyOptional({ enum: ACTIVITY_TYPES })
  @IsOptional()
  @IsIn([...ACTIVITY_TYPES], { message: "El tipo de actividad no es válido." })
  type?: ActivityType;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^c[a-z0-9]{20,30}$/i, { message: "El responsable no es válido." })
  assigneeId?: string;

  @ApiPropertyOptional({ description: "Solo las actividades de este negocio (enlace desde su ficha)" })
  @IsOptional()
  @Matches(/^c[a-z0-9]{20,30}$/i, { message: "El negocio no es válido." })
  dealId?: string;

  @ApiPropertyOptional({ enum: ["PENDING", "COMPLETED", "CANCELLED"] })
  @IsOptional()
  @IsIn(["PENDING", "COMPLETED", "CANCELLED"], {
    message: "El estado no es válido.",
  })
  status?: "PENDING" | "COMPLETED" | "CANCELLED";

  @ApiPropertyOptional({ enum: ["upcoming", "overdue", "all"] })
  @IsOptional()
  @IsIn(["upcoming", "overdue", "all"], { message: "El periodo no es válido." })
  period?: "upcoming" | "overdue" | "all";
}
