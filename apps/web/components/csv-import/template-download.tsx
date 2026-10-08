"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IMPORTACION } from "@/content/importacion";
import type { ImportFieldSpec } from "./csv-header";
import { downloadTemplate, type Template } from "./spreadsheet";

/** Descarga la plantilla de la importación en Excel (con hoja de instrucciones) o CSV. */
export function TemplateDownload<Spec extends ImportFieldSpec>(
  template: Template<Spec>,
) {
  return (
    <div className="import-template">
      <Button
        type="button"
        variant="secondary"
        onClick={() => downloadTemplate(template, "xlsx")}
      >
        <Download aria-hidden />
        {IMPORTACION.plantilla.excel}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => downloadTemplate(template, "csv")}
      >
        <Download aria-hidden />
        {IMPORTACION.plantilla.csv}
      </Button>
    </div>
  );
}
