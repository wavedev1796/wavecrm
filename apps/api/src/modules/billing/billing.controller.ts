import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/auth.decorators";
import type { JwtPayload } from "../auth/auth.service";
import { SendBillingDto } from "./billing.dto";
import { BillingService } from "./billing.service";

const actor = (user: JwtPayload) => ({ id: user.sub, role: user.role });

@ApiTags("billing")
@ApiBearerAuth()
@Controller("deals/:id/billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @ApiOperation({ summary: "Entrega a Wave Billing de la cotización aceptada y opciones de comprador" })
  find(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.billing.find(id, actor(user));
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: "Envía la venta ganada a Wave Billing, o reintenta si falló" })
  send(@Param("id") id: string, @Body() dto: SendBillingDto, @CurrentUser() user: JwtPayload) {
    return this.billing.send(id, dto, actor(user));
  }
}
