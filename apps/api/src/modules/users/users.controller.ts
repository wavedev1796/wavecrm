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
import { UserRole } from "@wave/database";
import { CurrentUser, Public, Roles } from "../auth/auth.decorators";
import type { JwtPayload } from "../auth/auth.service";
import {
  ActivateInvitationDto,
  CreateUserDto,
  ListUsersDto,
  UpdateUserDto,
} from "./users.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Public()
  @Get("invitations/:token")
  @ApiOperation({
    summary: "Valida una invitación y devuelve sus datos públicos",
  })
  invitation(@Param("token") token: string) {
    return this.users.invitation(token);
  }

  @Public()
  @Post("invitations/:token/activate")
  @HttpCode(200)
  @ApiOperation({
    summary: "Activa la cuenta invitada y establece su contraseña",
  })
  activate(@Param("token") token: string, @Body() dto: ActivateInvitationDto) {
    return this.users.activate(token, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  list(@Query() query: ListUsersDto) {
    return this.users.list(query);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Crea una cuenta pendiente y envía su invitación" })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: JwtPayload) {
    return this.users.create(dto, actor.sub);
  }

  @Get(":id")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  findOne(@Param("id") id: string) {
    return this.users.findOne(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.users.update(id, dto, actor.sub);
  }

  @Post(":id/resend-invitation")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  resend(@Param("id") id: string, @CurrentUser() actor: JwtPayload) {
    return this.users.resendInvitation(id, actor.sub);
  }

  @Patch(":id/deactivate")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  deactivate(@Param("id") id: string, @CurrentUser() actor: JwtPayload) {
    return this.users.deactivate(id, actor.sub);
  }

  @Patch(":id/reactivate")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  reactivate(@Param("id") id: string, @CurrentUser() actor: JwtPayload) {
    return this.users.reactivate(id, actor.sub);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(204)
  remove(@Param("id") id: string, @CurrentUser() actor: JwtPayload) {
    return this.users.remove(id, actor.sub);
  }
}
