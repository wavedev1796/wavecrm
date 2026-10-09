import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { CompanyImportModule } from "./modules/company-import/company-import.module";
import { ContactImportModule } from "./modules/contact-import/contact-import.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { HealthModule } from "./modules/health/health.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { PipelineModule } from "./modules/pipeline/pipeline.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    UsersModule,
    ContactsModule,
    CompaniesModule,
    ContactImportModule,
    CompanyImportModule,
    PipelineModule,
  ],
})
export class AppModule {}
