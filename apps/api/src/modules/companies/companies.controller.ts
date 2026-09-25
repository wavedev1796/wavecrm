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
import { CompaniesService } from "./companies.service";
import {
  CreateCompanyDto,
  ListCompaniesDto,
  UpdateCompanyDto,
} from "./companies.dto";

@ApiTags("companies")
@ApiBearerAuth()
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  @ApiOperation({
    summary: "Lista empresas con búsqueda, filtros y paginación",
  })
  list(@Query() query: ListCompaniesDto) {
    return this.companies.list(query);
  }

  @Post()
  @ApiOperation({ summary: "Crea una empresa" })
  create(@Body() dto: CreateCompanyDto, @CurrentUser() actor: JwtPayload) {
    return this.companies.create(dto, actor.sub);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene la ficha de una empresa" })
  findOne(@Param("id") id: string) {
    return this.companies.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualiza parcialmente una empresa" })
  update(@Param("id") id: string, @Body() dto: UpdateCompanyDto) {
    return this.companies.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Elimina una empresa" })
  remove(@Param("id") id: string) {
    return this.companies.remove(id);
  }
}
