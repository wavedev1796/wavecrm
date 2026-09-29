import {
  IsCedula,
  IsCanton,
  IsContactEmail,
  IsPersonName,
  IsPhone,
  IsPosition,
  IsProvince,
  IsRuc,
  IsTags,
} from '../../common/validation';

/** Campos que se pueden importar, en el orden en que se reportan los errores de una fila. */
export const IMPORT_FIELDS = [
  'firstName',
  'lastName',
  'documentId',
  'email',
  'phone',
  'province',
  'city',
  'position',
  'tags',
  'companyTaxId',
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

/** Una fila del CSV ya mapeada a los campos del contacto. */
export class ContactImportRowDto {
  @IsPersonName()
  firstName!: string;

  @IsPersonName('apellido')
  lastName!: string;

  @IsCedula()
  documentId?: string | null;

  @IsContactEmail()
  email?: string | null;

  @IsPhone()
  phone?: string | null;

  @IsProvince()
  province?: string | null;

  @IsCanton()
  city?: string | null;

  @IsPosition()
  position?: string | null;

  @IsTags()
  tags?: string[];

  /** RUC de una empresa ya registrada: la importación enlaza, no crea empresas. */
  @IsRuc()
  companyTaxId?: string | null;
}
