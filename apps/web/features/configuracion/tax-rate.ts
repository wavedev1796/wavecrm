/** IVA general: entero de 0 a 100, igual que valida el API. */
export const isTaxRate = (text: string) => /^\d{1,3}$/.test(text) && Number(text) <= 100;
