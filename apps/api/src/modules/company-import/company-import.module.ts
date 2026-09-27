import { Module } from '@nestjs/common';
import { CompanyImportController } from './company-import.controller';
import { CompanyImportService } from './company-import.service';

/** Importación de empresas desde CSV. Separado del CRUD de empresas, que es de CRM-13. */
@Module({ controllers: [CompanyImportController], providers: [CompanyImportService] })
export class CompanyImportModule {}
