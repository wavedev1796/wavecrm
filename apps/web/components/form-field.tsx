import { FieldError } from "@/components/ui/field-error";

/**
 * Etiqueta, control y su error. `id` enlaza el error con `invalidProps(id, error)` del control.
 * `required` pinta el `*` (solo visual: el control lleva `required`, que el lector de pantalla anuncia).
 */
export function Field({
  id,
  label,
  error,
  required = false,
  children,
}: Readonly<{
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}>) {
  return (
    <div className="form-field">
      <label>
        <span className={required ? "field-required" : undefined}>{label}</span>
        {children}
      </label>
      <FieldError id={id} message={error} />
    </div>
  );
}
