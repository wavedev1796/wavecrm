import { FieldError } from "@/components/ui/field-error";

/**
 * Etiqueta, control y su error. `id` es el del control: lo enlaza la etiqueta y `invalidProps(id, error)`.
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
      <label htmlFor={id} className={required ? "field-required" : undefined}>
        {label}
      </label>
      {children}
      <FieldError id={id} message={error} />
    </div>
  );
}
