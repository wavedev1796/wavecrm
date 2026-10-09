"use client";
import { useActionState, useEffect, useState } from "react";
import { BriefcaseBusiness, Check } from "lucide-react";
import { Field } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { invalidProps } from "@/components/ui/field-error";
import { useFieldErrors } from "@/components/use-field-errors";
import { PIPELINE } from "@/content/pipeline";
import { saveDeal } from "./actions";
import {
  emptyDeal,
  STATUS_LABEL,
  type Deal,
  type DealFormState,
  type DealValues,
  type Option,
  type Pipeline,
} from "./types";

type Props = {
  deal?: Deal;
  pipelineId: string;
  stageId: string;
  pipelines: Pipeline[];
  contacts: Option[];
  companies: Option[];
  users: Option[];
  onCancel: () => void;
  onSaved: (message: string) => void;
};
export function DealForm({
  deal,
  pipelineId,
  stageId,
  pipelines,
  contacts,
  companies,
  users,
  onCancel,
  onSaved,
}: Readonly<Props>) {
  const initial: DealFormState = {
    fieldErrors: {},
    values: {
      ...emptyDeal,
      pipelineId,
      stageId,
      ...(deal && {
        title: deal.title,
        value: String(deal.value),
        pipelineId: deal.pipelineId,
        stageId: deal.stageId,
        contactId: deal.contactId ?? "",
        companyId: deal.companyId ?? "",
        ownerId: deal.ownerId ?? "",
        expectedClose: deal.expectedClose?.slice(0, 10) ?? "",
        status: deal.status,
      }),
    },
  };
  const [state, action, pending] = useActionState(saveDeal, initial);
  const { formRef, error, onChange } = useFieldErrors(state.fieldErrors, {
    companyId: "contactId",
  });
  const [selectedPipeline, setSelectedPipeline] = useState(
    initial.values.pipelineId,
  );
  const [selectedStage, setSelectedStage] = useState(initial.values.stageId);
  const [status, setStatus] = useState(initial.values.status);
  const stages = pipelines.find((p) => p.id === selectedPipeline)?.stages ?? [];
  const saveLabel = deal ? PIPELINE.save : PIPELINE.create;
  useEffect(() => {
    if (state.savedId) onSaved(state.feedback?.message ?? PIPELINE.created);
  }, [state.savedId, state.feedback, onSaved]);
  const props = (name: keyof DealValues) => ({
    id: "deal-" + name,
    name,
    ...invalidProps("deal-" + name, error(name)),
  });
  const field = (name: keyof DealValues, label: string, required = false) => ({
    id: "deal-" + name,
    label,
    required,
    error: error(name),
  });
  const options = (items: Option[], current: Option | null | undefined) =>
    current && !items.some((o) => o.id === current.id)
      ? [...items, current]
      : items;
  const contact = deal?.contact
    ? {
        id: deal.contact.id,
        name: deal.contact.firstName + " " + deal.contact.lastName,
      }
    : null;
  return (
    <form
      ref={formRef}
      action={action}
      onChange={onChange}
      className="contact-form contact-form--modal deal-form"
      noValidate
      aria-busy={pending}
    >
      {deal && <input type="hidden" name="id" value={deal.id} />}
      <header>
        <span className="contact-form-icon">
          <BriefcaseBusiness aria-hidden />
        </span>
        <div>
          <h2>{deal ? PIPELINE.editDeal : PIPELINE.newDeal}</h2>
          <p>{PIPELINE.help}</p>
        </div>
      </header>
      {state.feedback?.tone === "error" && (
        <Alert tone="error">{state.feedback.message}</Alert>
      )}
      <fieldset disabled={pending} className="deal-form-fields">
        <div className="contact-form-grid">
          <div className="deal-form-wide">
            <Field {...field("title", "Nombre del negocio", true)}>
              <Input
                {...props("title")}
                required
                autoFocus
                maxLength={160}
                defaultValue={state.values.title}
                placeholder="Ej. Renovacion de contrato anual"
              />
            </Field>
          </div>
          <Field {...field("value", "Monto (USD)", true)}>
            <Input
              {...props("value")}
              required
              inputMode="decimal"
              type="text"
              defaultValue={state.values.value}
              placeholder="0.00"
            />
          </Field>
          <Field {...field("expectedClose", "Fecha estimada de cierre")}>
            <Input
              {...props("expectedClose")}
              type="date"
              defaultValue={state.values.expectedClose}
            />
          </Field>
          <Field {...field("pipelineId", "Pipeline", true)}>
            <Select
              {...props("pipelineId")}
              value={selectedPipeline}
              required
              onChange={(event) => {
                setSelectedPipeline(event.target.value);
                setSelectedStage(
                  pipelines.find((p) => p.id === event.target.value)?.stages[0]
                    ?.id ?? "",
                );
                setStatus("");
              }}
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field {...field("stageId", "Etapa", true)}>
            <Select
              {...props("stageId")}
              value={selectedStage}
              required
              onChange={(event) => {
                setSelectedStage(event.target.value);
                setStatus("");
              }}
            >
              <option value="">Selecciona una etapa</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.probability}%
                </option>
              ))}
            </Select>
          </Field>
          <p className="deal-form-wide deal-form-hint">{PIPELINE.linked}</p>
          <Field {...field("contactId", "Contacto")}>
            <Select
              {...props("contactId")}
              defaultValue={state.values.contactId}
            >
              <option value="">Selecciona un contacto</option>
              {options(contacts, contact).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field {...field("companyId", "Empresa")}>
            <Select
              {...props("companyId")}
              defaultValue={state.values.companyId}
            >
              <option value="">Selecciona una empresa</option>
              {options(companies, deal?.company).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field {...field("ownerId", "Responsable")}>
            <Select {...props("ownerId")} defaultValue={state.values.ownerId}>
              <option value="">
                {deal ? "Conservar responsable" : "Asignarme este negocio"}
              </option>
              {options(users, deal?.owner).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field {...field("status", "Estado")}>
            <Select
              {...props("status")}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Segun la etapa</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>
      <footer>
        <Button
          variant="secondary"
          type="button"
          onClick={onCancel}
          disabled={pending}
        >
          {PIPELINE.cancel}
        </Button>
        <Button type="submit" loading={pending}>
          <Check aria-hidden />
          {pending ? "Guardando..." : saveLabel}
        </Button>
      </footer>
    </form>
  );
}
