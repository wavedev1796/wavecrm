// Montos al estilo de Ecuador, compartidos por los formularios de la web.
// El punto de miles es opcional (8000 = 8.000) y solo la coma marca los centavos (8.000,50).
// El API no los usa: recibe el número normalizado en JSON (8000.5).

const AMOUNT = /^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/;

/** Número que escribió la persona, o `null` si no es un monto válido. `maxInteger`: dígitos enteros permitidos. */
export function parseAmount(value: string, maxInteger = 12): number | null {
  const text = value.trim();
  if (!AMOUNT.test(text)) return null;
  const [integer = '', cents = '0'] = text.replace(/\./g, '').split(',');
  return integer.length > maxInteger ? null : Number(integer + '.' + cents);
}

/**
 * Número del API (`8452.5` o `"8452.50"`) como lo escribe la persona: `8.452,50`.
 * Sin Intl a propósito: el ICU de Node y el del navegador no siempre coinciden y rompen la hidratación.
 */
export function formatAmount(value: number | string): string {
  const [integer = '', cents = ''] = Number(value).toFixed(2).split('.');
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + cents;
}
