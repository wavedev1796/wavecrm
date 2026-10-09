"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { Field } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { configurePipelineAction } from "./actions";
import type { Pipeline } from "./types";

export function PipelineSettings({
  pipelines,
  pipelineId,
}: Readonly<{
  pipelines: Pipeline[];
  pipelineId: string;
}>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [managedId, setManagedId] = useState(pipelineId);
  const [stageId, setStageId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [confirm, setConfirm] = useState<"stage" | "pipeline" | null>(null);
  const [pending, startTransition] = useTransition();
  const pipeline = pipelines.find((p) => p.id === managedId);
  const stage = pipeline?.stages.find((s) => s.id === stageId);
  const nextPosition =
    Math.max(-1, ...(pipeline?.stages.map((s) => s.position) ?? [])) + 1;
  const run = (
    operation: Parameters<typeof configurePipelineAction>[0],
    id: string,
    data: FormData,
  ) => {
    setFeedback("");
    startTransition(async () => {
      const result = await configurePipelineAction(operation, id, data);
      if (result.error) {
        setFeedback(result.error);
        setConfirm(null);
        return;
      }
      dialog.current?.close();
      setConfirm(null);
      if (operation === "createPipeline")
        router.push(
          "/pipeline?pipelineId=" + (result.data as { id: string }).id,
        );
      else if (operation === "deletePipeline") router.push("/pipeline");
      else router.refresh();
    });
  };
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setManagedId(pipelineId);
          setStageId("");
          setFeedback("");
          setConfirm(null);
          dialog.current?.showModal();
        }}
      >
        <Settings2 aria-hidden />
        Configurar pipeline
      </Button>
      <FormDialog
        dialogRef={dialog}
        label="Configurar pipeline"
        closeLabel="Cerrar configuracion"
      >
        <div className="pipeline-settings contact-form contact-form--modal">
          <header>
            <span className="contact-form-icon">
              <Settings2 aria-hidden />
            </span>
            <div>
              <h2>Configurar pipeline</h2>
              <p>Organiza las etapas y su probabilidad de cierre.</p>
            </div>
          </header>
          {feedback && <Alert tone="error">{feedback}</Alert>}
          <div className="pipeline-settings-body">
            <Field id="manage-pipeline" label="Pipeline">
              <Select
                id="manage-pipeline"
                disabled={pending}
                value={managedId}
                onChange={(event) => {
                  setManagedId(event.target.value);
                  setStageId("");
                  setConfirm(null);
                }}
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="">Crear otro pipeline</option>
              </Select>
            </Field>
            <form
              key={"pipeline-" + managedId}
              onSubmit={(event) => {
                event.preventDefault();
                run(
                  pipeline ? "updatePipeline" : "createPipeline",
                  managedId,
                  new FormData(event.currentTarget),
                );
              }}
            >
              <fieldset disabled={pending} className="deal-form-fields">
                <div className="pipeline-settings-grid">
                  <Field id="pipeline-name" label="Nombre" required>
                    <Input
                      id="pipeline-name"
                      name="name"
                      required
                      minLength={2}
                      maxLength={100}
                      defaultValue={pipeline?.name ?? ""}
                    />
                  </Field>
                  <Field id="pipeline-default" label="Pipeline principal">
                    <Select
                      id="pipeline-default"
                      name="isDefault"
                      defaultValue={pipeline?.isDefault ? "true" : "false"}
                    >
                      <option value="false">
                        Conservar el principal actual
                      </option>
                      <option value="true">Usar como principal</option>
                    </Select>
                  </Field>
                </div>
                <div className="pipeline-settings-actions">
                  <Button type="submit" loading={pending}>
                    {pipeline ? "Guardar pipeline" : "Crear pipeline"}
                  </Button>
                  {pipeline && !pipeline.isDefault && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setConfirm("pipeline")}
                    >
                      Eliminar pipeline
                    </Button>
                  )}
                </div>
              </fieldset>
            </form>
            {pipeline && (
              <>
                <h3>Etapas del embudo</h3>
                <Field id="manage-stage" label="Etapa a configurar">
                  <Select
                    id="manage-stage"
                    value={stageId}
                    disabled={pending}
                    onChange={(event) => {
                      setStageId(event.target.value);
                      setConfirm(null);
                    }}
                  >
                    <option value="">Agregar nueva etapa</option>
                    {pipeline.stages.map((s, index) => (
                      <option key={s.id} value={s.id}>
                        {index + 1}. {s.name} · {s.probability}%
                      </option>
                    ))}
                  </Select>
                </Field>
                <form
                  key={"stage-" + managedId + "-" + stageId}
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(
                      stage ? "updateStage" : "createStage",
                      stage?.id ?? pipeline.id,
                      new FormData(event.currentTarget),
                    );
                  }}
                >
                  <fieldset disabled={pending} className="deal-form-fields">
                    <div className="pipeline-settings-grid">
                      <Field id="stage-name" label="Nombre de etapa" required>
                        <Input
                          id="stage-name"
                          name="name"
                          required
                          minLength={2}
                          maxLength={80}
                          defaultValue={stage?.name ?? ""}
                        />
                      </Field>
                      <Field
                        id="stage-probability"
                        label="Probabilidad (%)"
                        required
                      >
                        <Input
                          id="stage-probability"
                          name="probability"
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          required
                          defaultValue={stage?.probability ?? 0}
                        />
                      </Field>
                      <Field
                        id="stage-position"
                        label="Orden de la etapa"
                        required
                      >
                        <Select
                          id="stage-position"
                          name="position"
                          required
                          defaultValue={stage?.position ?? nextPosition}
                        >
                          {stage ? (
                            pipeline.stages.map((item, index) => (
                              <option key={item.id} value={item.position}>
                                {index + 1}. {item.name}
                              </option>
                            ))
                          ) : (
                            <option value={nextPosition}>
                              Al final del pipeline
                            </option>
                          )}
                        </Select>
                      </Field>
                      <Field id="stage-color" label="Color">
                        <Select
                          id="stage-color"
                          name="color"
                          defaultValue={stage?.color ?? "#2f6f8f"}
                        >
                          {stage?.color &&
                            ![
                              "#2f6f8f",
                              "#6F9FD8",
                              "#E0B15A",
                              "#2f8f5b",
                              "#C9C7BC",
                            ].includes(stage.color) && (
                              <option value={stage.color}>Color actual</option>
                            )}
                          <option value="#2f6f8f">Azul Wave</option>
                          <option value="#6F9FD8">Celeste</option>
                          <option value="#E0B15A">Amarillo</option>
                          <option value="#2f8f5b">Verde</option>
                          <option value="#C9C7BC">Gris</option>
                        </Select>
                      </Field>
                    </div>
                    <p className="deal-form-hint">
                      Al editar una posicion ocupada, las dos etapas
                      intercambian su lugar. Una etapa al 100% marca como ganado
                      al ingresar un negocio.
                    </p>
                    <div className="pipeline-settings-actions">
                      <Button type="submit" loading={pending}>
                        {stage ? "Guardar etapa" : "Agregar etapa"}
                      </Button>
                      {stage && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setConfirm("stage")}
                        >
                          Eliminar etapa
                        </Button>
                      )}
                    </div>
                  </fieldset>
                </form>
              </>
            )}
            {confirm && (
              <div className="pipeline-delete-confirm">
                <p>
                  Confirma que deseas eliminar{" "}
                  {confirm === "stage" ? stage?.name : pipeline?.name}. Solo se
                  permite si no tiene negocios ni historial.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => setConfirm(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  loading={pending}
                  onClick={() =>
                    run(
                      confirm === "stage" ? "deleteStage" : "deletePipeline",
                      confirm === "stage" ? stageId : managedId,
                      new FormData(),
                    )
                  }
                >
                  Confirmar eliminacion
                </Button>
              </div>
            )}
          </div>
        </div>
      </FormDialog>
    </>
  );
}
