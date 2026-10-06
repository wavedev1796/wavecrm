import type { ComponentProps } from "react";
import { Card } from "@/components/ui/card";
import { IMPORTACION } from "@/content/importacion";
import { ImportForm } from "./import-form";
import { TemplateDownload } from "./template-download";

type Props = ComponentProps<typeof ImportForm> &
  Readonly<{
    title: string;
    /** Reglas propias de la entidad; las de tamaño y "todo o nada" son comunes. */
    rules: readonly string[];
  }>;

/** Pantalla de importación (contactos, empresas): instrucciones, plantilla y formulario. */
export function ImportPage({ title, rules, ...form }: Props) {
  return (
    <Card className="import-card">
      <h2>{title}</h2>
      <p>{IMPORTACION.intro}</p>
      <ul className="import-rules">
        {[...rules, ...IMPORTACION.reglasComunes].map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <TemplateDownload
        fields={form.fields}
        fileName={`plantilla-${form.noun}`}
      />
      <ImportForm {...form} />
    </Card>
  );
}
