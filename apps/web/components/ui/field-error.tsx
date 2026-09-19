/** Error de un campo. Se enlaza al input con `invalidProps` para que el lector de pantalla lo lea. */
export function FieldError({ id, message }: { id: string; message?: string | null }) {
  return message ? (
    <p id={`${id}-error`} className="field-error">
      {message}
    </p>
  ) : null;
}

/** Atributos de accesibilidad del input cuando su campo tiene error. */
export function invalidProps(id: string, message?: string | null) {
  return message ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {};
}
