import { FieldError } from "@/components/ui/field-error";

/** Etiqueta, control y su error. `id` enlaza el error con `invalidProps(id, error)` del control. */
export function Field({
  id,
  label,
  error,
  children,
}: Readonly<{
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="form-field">
      <label>
        {label}
        {children}
      </label>
      <FieldError id={id} message={error} />
    </div>
  );
}
