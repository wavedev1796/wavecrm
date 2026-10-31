import { Module } from "@nestjs/common";
import { MailerModule } from "../mailer/mailer.module";
import { ActivitiesController } from "./activities.controller";
import { ActivityRemindersService } from "./activity-reminders.service";
import { ActivitiesService } from "./activities.service";

@Module({
  imports: [MailerModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, ActivityRemindersService],
})
export class ActivitiesModule {}
