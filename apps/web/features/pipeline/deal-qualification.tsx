"use client";
import { useState, useTransition, type FormEvent } from "react";
import { ClipboardCheck } from "lucide-react";
import { formatAmount } from "@wave/shared";
import { Field } from "@/components/form/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { NEGOCIO } from "@/content/pipeline";
import { formatMoney } from "@/lib/format";
import { qualifyDealAction } from "./actions";
import type { DealDetail } from "./types";

const texto = NEGOCIO.calificacion;
const TEXTS = [
  ["need", texto.necesidad, 2000, "necesidad"],
  ["solution", texto.solucion, 2000, "solucion"],
] as const;

const viability = (viable: boolean | null | undefined) =>
  viable === true ? texto.viable : viable === false ? texto.noViable : texto.sinEvaluar;

/**
 * Necesidad, solución, presupuesto y persona decisora: los datos que piden las etapas Negociación y Propuesta.
 * Viabilidad y su evidencia (P4): se exigen para ganar.
 */
export function DealQualification({ deal, locked }: Readonly<{ deal: DealDetail; locked: boolean }>) {
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [budgetError, setBudgetError] = useState<string>();
  const [noteError, setNoteError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      setFeedback(null);
      const result = await qualifyDealAction(deal.id, form);
      setBudgetError(result.fieldErrors?.budget);
      setNoteError(result.fieldErrors?.viabilityNote);
      if (result.error) setFeedback({ tone: "error", message: result.error });
      else if (!result.fieldErrors) setFeedback({ tone: "success", message: texto.guardada });
    });
  };
  const title = (
    <h3>
      <ClipboardCheck aria-hidden />
      {texto.titulo}
    </h3>
  );
  if (locked)
    return (
      <Card className="contact-data-card deal-qualification">
        {title}
        <dl>
          {[
            [texto.necesidad, deal.need],
            [texto.solucion, deal.solution],
            [texto.presupuesto, deal.budget != null ? formatMoney(deal.budget) : null],
            [texto.justificacion, deal.budgetNote],
            [texto.decisor, deal.decisionMaker],
            [texto.viabilidad, viability(deal.viable)],
            [texto.evidencia, deal.viabilityNote],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || texto.vacio}</dd>
            </div>
          ))}
        </dl>
      </Card>
    );
  return (
    <Card className="contact-data-card deal-qualification">
      {title}
      {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}
      <form onSubmit={submit} noValidate aria-busy={pending} className="deal-qualification-form">
        {TEXTS.map(([name, label, max, icon]) => (
          <Field key={name} id={"qualify-" + name} label={label} icon={icon}>
            <textarea
              id={"qualify-" + name}
              name={name}
              className="input deal-textarea"
              maxLength={max}
              defaultValue={deal[name] ?? ""}
            />
          </Field>
        ))}
        <Field id="qualify-budget" label={texto.presupuesto} error={budgetError} icon="dinero">
          <Input
            id="qualify-budget"
            name="budget"
            inputMode="decimal"
            maxLength={16}
            defaultValue={deal.budget == null ? "" : formatAmount(deal.budget)}
            {...invalidProps("qualify-budget", budgetError)}
          />
        </Field>
        <Field id="qualify-budgetNote" label={texto.justificacion} icon="texto">
          <textarea
            id="qualify-budgetNote"
            name="budgetNote"
            className="input deal-textarea"
            maxLength={1000}
            defaultValue={deal.budgetNote ?? ""}
          />
        </Field>
        <Field id="qualify-decisionMaker" label={texto.decisor} icon="decisor">
          <Input id="qualify-decisionMaker" name="decisionMaker" maxLength={160} defaultValue={deal.decisionMaker ?? ""} />
        </Field>
        <Field id="qualify-viable" label={texto.viabilidad} icon="evidencia">
          <Select
            id="qualify-viable"
            name="viable"
            defaultValue={deal.viable === true ? "yes" : deal.viable === false ? "no" : ""}
          >
            <option value="">{texto.sinEvaluar}</option>
            <option value="yes">{texto.viable}</option>
            <option value="no">{texto.noViable}</option>
          </Select>
        </Field>
        <Field id="qualify-viabilityNote" label={texto.evidencia} error={noteError} icon="evidencia">
          <textarea
            id="qualify-viabilityNote"
            name="viabilityNote"
            className="input deal-textarea"
            maxLength={1000}
            defaultValue={deal.viabilityNote ?? ""}
            {...invalidProps("qualify-viabilityNote", noteError)}
          />
        </Field>
        <p className="field-hint">{texto.evidenciaAyuda}</p>
        <Button type="submit" variant="secondary" loading={pending}>
          {texto.guardar}
        </Button>
      </form>
    </Card>
  );
}
