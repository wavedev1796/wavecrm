import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/auth.decorators";
import type { JwtPayload } from "../auth/auth.service";
import { TimelineQueryDto } from "./timeline.dto";
import { TimelineService } from "./timeline.service";

@ApiTags("timeline")
@ApiBearerAuth()
@Controller()
export class TimelineController {
  constructor(private readonly timeline: TimelineService) {}

  @Get("deals/:id/timeline")
  @ApiOperation({
    summary: "Línea de tiempo de un negocio, paginada por cursor (VENDEDOR: solo los suyos)",
  })
  deal(
    @Param("id") id: string,
    @Query() query: TimelineQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.timeline.forDeal(id, { id: user.sub, role: user.role }, query);
  }

  @Get("contacts/:id/timeline")
  @ApiOperation({
    summary: "Línea de tiempo de un contacto y sus negocios visibles, paginada por cursor",
  })
  contact(
    @Param("id") id: string,
    @Query() query: TimelineQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.timeline.forContact(id, { id: user.sub, role: user.role }, query);
  }
}
