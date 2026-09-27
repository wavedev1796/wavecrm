import type { ComponentProps } from "react";
import { Card } from "@/components/ui/card";
import { ImportForm } from "./import-form";

type Props = ComponentProps<typeof ImportForm> &
  Readonly<{
    title: string;
    /** Reglas propias de la entidad; las de tamaño y "todo o nada" son comunes. */
    rules: string[];
  }>;

/** Pantalla de importación CSV (contactos, empresas): instrucciones y formulario. */
export function ImportPage({ title, rules, ...form }: Props) {
  return (
    <Card className="import-card">
      <h2>{title}</h2>
      <p>
        Guarda la hoja desde Excel como «CSV UTF-8» (o «CSV delimitado por
        comas»), elige qué columna corresponde a cada dato e impórtala.
      </p>
      <ul className="import-rules">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
        <li>Máximo 1 MB y 1000 filas por archivo.</li>
        <li>
          Si alguna fila tiene errores no se guarda ninguna: corrige las filas
          indicadas y vuelve a subir el archivo.
        </li>
      </ul>
      <ImportForm {...form} />
    </Card>
  );
}
