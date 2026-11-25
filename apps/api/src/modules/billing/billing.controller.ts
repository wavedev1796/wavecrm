import { Body, Controller, Get, HttpCode, Param, Post, StreamableFile } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/auth.decorators";
import type { JwtPayload } from "../auth/auth.service";
import { EmailBillingDto, ReissueBillingDto, SendBillingDto } from "./billing.dto";
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

  @Post("refresh")
  @HttpCode(200)
  @ApiOperation({ summary: "Consulta a Wave Billing el estado de una factura enviada" })
  refresh(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.billing.refresh(id, actor(user));
  }

  @Post("reissue")
  @HttpCode(200)
  @ApiOperation({ summary: "Reemite una factura devuelta con los datos actuales del comprador" })
  reissue(@Param("id") id: string, @Body() dto: ReissueBillingDto, @CurrentUser() user: JwtPayload) {
    return this.billing.reissue(id, dto, actor(user));
  }

  @Post("email")
  @HttpCode(200)
  @ApiOperation({ summary: "Reenvía por correo la factura autorizada" })
  email(@Param("id") id: string, @Body() dto: EmailBillingDto, @CurrentUser() user: JwtPayload) {
    return this.billing.email(id, dto, actor(user));
  }

  @Get("ride")
  @ApiOperation({ summary: "RIDE (PDF) de la factura" })
  async ride(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    const { data, type, name } = await this.billing.file(id, "ride", actor(user));
    return new StreamableFile(data, { type, disposition: `inline; filename="${name}"` });
  }

  @Get("xml")
  @ApiOperation({ summary: "XML autorizado de la factura" })
  async xml(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    const { data, type, name } = await this.billing.file(id, "xml", actor(user));
    return new StreamableFile(data, { type, disposition: `attachment; filename="${name}"` });
  }
}
