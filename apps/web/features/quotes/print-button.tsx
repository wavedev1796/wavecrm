"use client";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// ponytail: el PDF lo arma el diálogo de impresión del navegador con los estilos de impresión;
// si hace falta guardar el archivo o adjuntarlo a un correo (CRM-36), generarlo en el API.
export function PrintButton({ label }: Readonly<{ label: string }>) {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Download aria-hidden />{label}
    </Button>
  );
}
