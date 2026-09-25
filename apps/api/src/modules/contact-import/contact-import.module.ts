import { Module } from '@nestjs/common';
import { ContactImportController } from './contact-import.controller';
import { ContactImportService } from './contact-import.service';

/** Importación de contactos desde CSV (CRM-16). Separado del CRUD de contactos, que es de CRM-13. */
@Module({ controllers: [ContactImportController], providers: [ContactImportService] })
export class ContactImportModule {}
