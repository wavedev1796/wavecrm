import { PickType } from '@nestjs/swagger';
import { CreateCompanyDto } from '../companies/companies.dto';

/** Campos que se pueden importar, en el orden en que se reportan los errores de una fila. */
export const COMPANY_IMPORT_FIELDS = ['name', 'legalName', 'taxId', 'email', 'phone', 'province', 'city', 'tags'] as const;

export type CompanyImportField = (typeof COMPANY_IMPORT_FIELDS)[number];

/** Una fila del CSV con las mismas reglas que el alta de empresa (CRM-13). */
export class CompanyImportRowDto extends PickType(CreateCompanyDto, COMPANY_IMPORT_FIELDS) {}
