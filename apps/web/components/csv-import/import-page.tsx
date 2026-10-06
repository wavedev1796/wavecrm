import type { ComponentProps } from "react";
import { Card } from "@/components/ui/card";
import { ImportForm } from "./import-form";
import { TemplateDownload } from "./template-download";

type Props = ComponentProps<typeof ImportForm> &
  Readonly<{
    title: string;
    /** Reglas propias de la entidad; las de tamaño y "todo o nada" son comunes. */
    rules: string[];
  }>;

/** Pantalla de importación (contactos, empresas): instrucciones, plantilla y formulario. */
export function ImportPage({ title, rules, ...form }: Props) {
  return (
    <Card className="import-card">
      <h2>{title}</h2>
      <p>
        Sube la hoja de Excel (.xlsx) o un CSV, elige qué columna corresponde a
        cada dato e impórtala. Si empiezas de cero, descarga la plantilla.
      </p>
      <ul className="import-rules">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
        <li>
          En Excel, da formato de texto a las columnas de documento y teléfono
          antes de escribirlas: si no, se pierde el 0 inicial.
        </li>
        <li>Máximo 1 MB y 1000 filas por archivo. De un Excel se lee la primera hoja.</li>
        <li>
          Si alguna fila tiene errores no se guarda ninguna: corrige las filas
          indicadas y vuelve a subir el archivo.
        </li>
      </ul>
      <TemplateDownload
        fields={form.fields}
        fileName={`plantilla-${form.noun}`}
      />
      <ImportForm {...form} />
    </Card>
  );
}
