import { Module } from "@nestjs/common";
import { InvitationMailerService } from "./invitation-mailer.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  controllers: [UsersController],
  providers: [UsersService, InvitationMailerService],
})
export class UsersModule {}
