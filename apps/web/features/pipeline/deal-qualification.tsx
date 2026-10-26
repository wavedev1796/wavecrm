"use client";
import { useState, useTransition, type FormEvent } from "react";
import { ClipboardCheck } from "lucide-react";
import { Field } from "@/components/form/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { NEGOCIO } from "@/content/pipeline";
import { formatMoney } from "@/lib/format";
import { qualifyDealAction } from "./actions";
import type { DealDetail } from "./types";

const texto = NEGOCIO.calificacion;
const TEXTS = [
  ["need", texto.necesidad, 2000],
  ["solution", texto.solucion, 2000],
] as const;

/** Necesidad, solución, presupuesto y persona decisora: los datos que piden las etapas Negociación y Propuesta. */
export function DealQualification({ deal, locked }: Readonly<{ deal: DealDetail; locked: boolean }>) {
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [budgetError, setBudgetError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      setFeedback(null);
      const result = await qualifyDealAction(deal.id, form);
      setBudgetError(result.fieldErrors?.budget);
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
        {TEXTS.map(([name, label, max]) => (
          <Field key={name} id={"qualify-" + name} label={label}>
            <textarea
              id={"qualify-" + name}
              name={name}
              className="input deal-textarea"
              maxLength={max}
              defaultValue={deal[name] ?? ""}
            />
          </Field>
        ))}
        <Field id="qualify-budget" label={texto.presupuesto} error={budgetError}>
          <Input
            id="qualify-budget"
            name="budget"
            inputMode="decimal"
            maxLength={16}
            defaultValue={deal.budget ?? ""}
            {...invalidProps("qualify-budget", budgetError)}
          />
        </Field>
        <Field id="qualify-budgetNote" label={texto.justificacion}>
          <textarea
            id="qualify-budgetNote"
            name="budgetNote"
            className="input deal-textarea"
            maxLength={1000}
            defaultValue={deal.budgetNote ?? ""}
          />
        </Field>
        <Field id="qualify-decisionMaker" label={texto.decisor}>
          <Input id="qualify-decisionMaker" name="decisionMaker" maxLength={160} defaultValue={deal.decisionMaker ?? ""} />
        </Field>
        <Button type="submit" variant="secondary" loading={pending}>
          {texto.guardar}
        </Button>
      </form>
    </Card>
  );
}
