"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IMPORTACION } from "@/content/importacion";
import type { ImportFieldSpec } from "./csv-header";
import { downloadTemplate } from "./spreadsheet";

type Props = Readonly<{
  fields: readonly ImportFieldSpec[];
  /** Nombre del archivo descargado, sin extensión: "plantilla-contactos". */
  fileName: string;
}>;

/** Descarga la plantilla de la importación en Excel o CSV (CRM-18). */
export function TemplateDownload({ fields, fileName }: Props) {
  return (
    <div className="import-template">
      <Button
        type="button"
        variant="secondary"
        onClick={() => downloadTemplate(fields, fileName, "xlsx")}
      >
        <Download aria-hidden />
        {IMPORTACION.plantilla.excel}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => downloadTemplate(fields, fileName, "csv")}
      >
        <Download aria-hidden />
        {IMPORTACION.plantilla.csv}
      </Button>
    </div>
  );
}
