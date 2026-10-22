import type { ComponentProps } from "react";
import { Card } from "@/components/ui/card";
import { IMPORTACION } from "@/content/importacion";
import type { ImportFieldSpec } from "./csv-header";
import { ImportForm } from "./import-form";
import type { TemplateGuide } from "./spreadsheet";
import { TemplateDownload } from "./template-download";

type Props<Spec extends ImportFieldSpec> = ComponentProps<typeof ImportForm> &
  Readonly<{
    title: string;
    /** Reglas propias de la entidad; las de tamaño y "todo o nada" son comunes. */
    rules: readonly string[];
    fields: readonly Spec[];
    /** Hoja de datos e instrucciones de la plantilla Excel, con una entrada por campo. */
    guide: TemplateGuide<Spec["field"]>;
  }>;

/** Pantalla de importación (contactos, empresas): instrucciones, plantilla y formulario. */
export function ImportPage<Spec extends ImportFieldSpec>({
  title,
  rules,
  guide,
  ...form
}: Props<Spec>) {
  const allRules = [...rules, ...IMPORTACION.reglasComunes];
  return (
    <Card className="import-card">
      <h2>{title}</h2>
      <p>{IMPORTACION.intro}</p>
      <ul className="import-rules">
        {allRules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <TemplateDownload
        fields={form.fields}
        fileName={`plantilla-${form.noun}`}
        guide={guide}
        rules={allRules}
      />
      <ImportForm {...form} />
    </Card>
  );
}
