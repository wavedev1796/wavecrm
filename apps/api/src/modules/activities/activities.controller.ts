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
  ) {
    return this.activities.update(id, dto);
  }

  @Patch(":id/complete") complete(@Param("id") id: string) {
    return this.activities.complete(id);
  }

  @Delete(":id") @HttpCode(204) remove(@Param("id") id: string) {
    return this.activities.remove(id);
  }
}
