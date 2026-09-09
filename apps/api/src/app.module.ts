import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActivitiesModule } from './modules/activities/activities.module';
import { AuthModule } from './modules/auth/auth.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { DealsModule } from './modules/deals/deals.module';
import { HealthModule } from './modules/health/health.module';
import { NotesModule } from './modules/notes/notes.module';
import { PipelinesModule } from './modules/pipelines/pipelines.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { StagesModule } from './modules/stages/stages.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    PrismaModule,
    AuthModule,
    HealthModule,
    UsersModule,
    CompaniesModule,
    ContactsModule,
    DealsModule,
    PipelinesModule,
    StagesModule,
    ActivitiesModule,
    QuotesModule,
    NotesModule,
    AttachmentsModule,
    AuditLogsModule,
  ],
})
export class AppModule {}
