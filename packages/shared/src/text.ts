// Limpieza del texto de los formularios, compartida por la web y el API.
// No toca el HTML: React escapa al pintar y Prisma parametriza las consultas. Quitar «<» dañaría textos reales.

/**
 * Controles C0 y C1 (salvo tabulador y saltos de línea, que se tratan aparte), el nulo que Postgres rechaza,
 * invisibles (guion blando, ancho cero, joiners, BOM), marcas de dirección que disfrazan el texto (bidi),
 * etiquetas U+E0000 y sustitutos sueltos (con la bandera `u`, un par válido es un solo carácter y no coincide).
 */
const UNSAFE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF\uFFF9-\uFFFB]|[\u{E0000}-\u{E007F}]|[\uD800-\uDFFF]/gu;

/**
 * Texto de un campo listo para validar y guardar: Unicode compuesto (NFC), sin caracteres peligrosos, recortado
 * y con los espacios normalizados. Una línea: todo espacio se vuelve uno solo. `multiline`: conserva los saltos
 * de línea (hasta una línea en blanco seguida) para notas y motivos.
 */
export function cleanText(value: string, multiline = false) {
  const text = value.normalize('NFC').replace(UNSAFE, '');
  return (
    multiline
      ? text
          .replace(/\r\n?/g, '\n')
          .replace(/[^\S\n]+/g, ' ')
          .replace(/ ?\n ?/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
      : text.replace(/\s+/g, ' ')
  ).trim();
}
