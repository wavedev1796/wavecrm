import type { ReactNode } from "react";
import { COMUN } from "@/content/comun";

/** Fila de dato de una ficha (contacto, empresa, negocio): icono, etiqueta y valor o "Sin dato". */
export function Info({
  icon,
  label,
  value,
}: Readonly<{ icon: ReactNode; label: string; value?: ReactNode }>) {
  return (
    <div>
      <dt>
        {icon}
        <span>{label}</span>
      </dt>
      <dd>{value || COMUN.sinDato}</dd>
    </div>
  );
}
