import { Body, Controller, Delete, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/auth.decorators";
import type { JwtPayload } from "../auth/auth.service";
import { CreateNoteDto, UpdateNoteDto } from "./notes.dto";
import { NotesService } from "./notes.service";

const actor = (user: JwtPayload) => ({ id: user.sub, role: user.role });

@ApiTags("notes")
@ApiBearerAuth()
@Controller()
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Post("deals/:id/notes")
  @ApiOperation({ summary: "Nota en un negocio, con menciones (VENDEDOR: solo en los suyos)" })
  deal(@Param("id") id: string, @Body() dto: CreateNoteDto, @CurrentUser() user: JwtPayload) {
    return this.notes.createForDeal(id, actor(user), dto);
  }

  @Post("contacts/:id/notes")
  @ApiOperation({ summary: "Nota en un contacto, con menciones (VENDEDOR: solo en los suyos)" })
  contact(@Param("id") id: string, @Body() dto: CreateNoteDto, @CurrentUser() user: JwtPayload) {
    return this.notes.createForContact(id, actor(user), dto);
  }

  @Patch("notes/:id")
  @ApiOperation({ summary: "Editar texto o menciones (autor o ADMIN); queda en la auditoría" })
  update(@Param("id") id: string, @Body() dto: UpdateNoteDto, @CurrentUser() user: JwtPayload) {
    return this.notes.update(id, actor(user), dto);
  }

  @Delete("notes/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Eliminar una nota (autor o ADMIN); queda una copia en la auditoría" })
  remove(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.notes.remove(id, actor(user));
  }
}
