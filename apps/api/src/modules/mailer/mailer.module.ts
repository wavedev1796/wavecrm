import { Module } from "@nestjs/common";
import { MailerService } from "./mailer.service";

/** Lo importan los módulos que necesitan enviar correo (usuarios y auth), sin depender entre sí. */
@Module({
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
