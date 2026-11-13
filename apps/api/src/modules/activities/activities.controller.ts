import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/auth.decorators";
import type { JwtPayload } from "../auth/auth.service";
import { ActivitiesService } from "./activities.service";
import {
  CreateActivityDto,
  ActivityHistoryQueryDto,
  ListActivitiesDto,
  UpdateActivityDto,
} from "./activities.dto";

@ApiTags("activities")
@ApiBearerAuth()
@Controller("activities")
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get("upcoming")
  @ApiOperation({ summary: "Lista actividades pendientes desde hoy" })
  upcoming(@Query() query: ListActivitiesDto) {
    return this.activities.list({ ...query, period: "upcoming" });
  }

  @Get("overdue")
  @ApiOperation({ summary: "Lista actividades pendientes atrasadas" })
  overdue(@Query() query: ListActivitiesDto) {
    return this.activities.list({ ...query, period: "overdue" });
  }

  @Get() list(@Query() query: ListActivitiesDto) {
    return this.activities.list(query);
  }

  @Get("history")
  @ApiOperation({ summary: "Historial paginado de auditoría de actividades" })
  history(@Query() query: ActivityHistoryQueryDto) {
    return this.activities.history(query);
  }

  @Post() create(
    @Body() dto: CreateActivityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.activities.create(dto, user.sub);
  }

  @Get(":id") findOne(@Param("id") id: string) {
    return this.activities.findOne(id);
  }

  @Patch(":id") update(
    @Param("id") id: string,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.activities.update(id, dto, user.sub);
  }

  @Patch(":id/complete") complete(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.activities.complete(id, user.sub);
  }

  @Patch(":id/cancel")
  @ApiOperation({ summary: "Cancela una actividad pendiente y conserva su historial" })
  cancel(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.activities.cancel(id, user.sub);
  }

  @Delete(":id") @HttpCode(204) remove(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.activities.remove(id, user.sub);
  }
}
