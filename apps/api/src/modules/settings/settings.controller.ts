import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/auth.decorators";
import type { JwtPayload } from "../auth/auth.service";
import { UpdateSettingsDto } from "./settings.dto";
import { SettingsService } from "./settings.service";

@ApiTags("settings")
@ApiBearerAuth()
@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: "Configuración general (IVA por defecto)" })
  get() {
    return this.settings.get();
  }

  @Patch()
  @ApiOperation({ summary: "Cambia el IVA general; solo ADMIN" })
  update(@Body() dto: UpdateSettingsDto, @CurrentUser() user: JwtPayload) {
    return this.settings.update(dto, { id: user.sub, role: user.role });
  }
}
