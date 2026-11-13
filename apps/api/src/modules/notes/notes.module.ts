import { Module } from "@nestjs/common";
import { MailerModule } from "../mailer/mailer.module";
import { NotesController } from "./notes.controller";
import { NotesService } from "./notes.service";

@Module({ imports: [MailerModule], controllers: [NotesController], providers: [NotesService] })
export class NotesModule {}
