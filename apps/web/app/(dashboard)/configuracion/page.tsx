import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { CONFIGURACION } from "@/content/configuracion";
import { authenticatedApi } from "@/lib/authenticated-api";
import { SettingsForm } from "../../../features/configuracion/settings-form";

export default async function ConfiguracionPage() {
  const me = await authenticatedApi("/auth/me");
  const role = me.ok ? ((await me.json()) as { role?: string }).role : undefined;
  if (role !== "ADMIN") redirect("/pipeline");

  const response = await authenticatedApi("/settings");
  const settings = response.ok ? ((await response.json()) as { taxRate?: number }) : null;
  if (typeof settings?.taxRate !== "number") return <Alert tone="error">{CONFIGURACION.errorCarga}</Alert>;
  return (
    <div className="settings-page">
      <Card className="settings-card">
        <h2>{CONFIGURACION.iva.titulo}</h2>
        <p>{CONFIGURACION.iva.ayuda}</p>
        <SettingsForm taxRate={settings.taxRate} />
      </Card>
    </div>
  );
}
