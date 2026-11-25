"use client";
import { useActionState } from "react";
import { Save } from "lucide-react";
import { IVA_SUGGESTIONS } from "@wave/shared";
import { Field } from "@/components/form/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { CONFIGURACION } from "@/content/configuracion";
import { saveSettingsAction } from "./actions";
import { isTaxRate } from "./tax-rate";

const texto = CONFIGURACION.iva;
type State = { error?: string; saved?: boolean; invalid?: boolean };

export function SettingsForm({ taxRate }: Readonly<{ taxRate: number }>) {
  const [state, formAction, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      // Se valida aquí para no viajar al servidor con un valor que el API va a rechazar.
      if (!isTaxRate(String(form.get("taxRate") ?? "").trim())) return { error: texto.error, invalid: true };
      return saveSettingsAction(previous, form);
    },
    {},
  );
  const fieldError = state.invalid ? state.error : undefined;
  return (
    <form action={formAction} className="settings-form" noValidate aria-busy={pending || undefined}>
      {state.saved && <Alert tone="success">{texto.guardado}</Alert>}
      {state.error && !state.invalid && <Alert tone="error">{state.error}</Alert>}
      <div className="settings-form-row">
        <Field id="settings-tax-rate" label={texto.campo} icon="porcentaje" required error={fieldError}>
          <Input
            id="settings-tax-rate"
            name="taxRate"
            required
            inputMode="numeric"
            maxLength={3}
            list="settings-tax-rate-options"
            defaultValue={taxRate}
            {...invalidProps("settings-tax-rate", fieldError)}
          />
          <datalist id="settings-tax-rate-options">
            {IVA_SUGGESTIONS.map((rate) => <option key={rate} value={rate} />)}
          </datalist>
        </Field>
        <Button type="submit" loading={pending}>
          <Save aria-hidden />
          {texto.guardar}
        </Button>
      </div>
    </form>
  );
}
