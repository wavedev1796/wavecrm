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
import {
  CreateContactDto,
  ListContactsDto,
  UpdateContactDto,
} from "./contacts.dto";
import { ContactsService } from "./contacts.service";

@ApiTags("contacts")
@ApiBearerAuth()
@Controller("contacts")
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  @ApiOperation({
    summary: "Lista contactos con búsqueda, filtros y paginación",
  })
  list(@Query() query: ListContactsDto) {
    return this.contacts.list(query);
  }

  @Post()
  @ApiOperation({ summary: "Crea un contacto" })
  create(@Body() dto: CreateContactDto, @CurrentUser() actor: JwtPayload) {
    return this.contacts.create(dto, actor.sub);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene la ficha de un contacto" })
  findOne(@Param("id") id: string): ReturnType<ContactsService["findOne"]> {
    return this.contacts.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualiza parcialmente un contacto" })
  update(@Param("id") id: string, @Body() dto: UpdateContactDto) {
    return this.contacts.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Elimina un contacto" })
  remove(@Param("id") id: string) {
    return this.contacts.remove(id);
  }
}
