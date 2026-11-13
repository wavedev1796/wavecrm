import { FieldError } from "@/components/ui/field-error";
import { FieldIcon, type FieldIconName } from "./field-icon";

/**
 * Etiqueta, control y su error. `id` es el del control: lo enlaza la etiqueta y `invalidProps(id, error)`.
 * `required` pinta el `*` (solo visual: el control lleva `required`, que el lector de pantalla anuncia).
 * `icon` pinta el icono del tipo de dato delante de la etiqueta (ver field-icon.tsx).
 */
export function Field({
  id,
  label,
  error,
  required = false,
  icon,
  children,
}: Readonly<{
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  icon?: FieldIconName;
  children: React.ReactNode;
}>) {
  return (
    <div className="form-field">
      <label htmlFor={id} className={required ? "field-required" : undefined}>
        {icon && <FieldIcon name={icon} />}
        {label}
      </label>
      {children}
      <FieldError id={id} message={error} />
    </div>
  );
}
