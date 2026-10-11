import Link from "next/link";
import "./pipeline.css";
import { unstable_rethrow } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { PipelineBoard } from "./pipeline-board";
import { PipelineSettings } from "./pipeline-settings";
import { allOptions, get } from "./data";
import type { Board, Option, Pipeline } from "./types";

export default async function PipelinePage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<{ pipelineId?: string }>;
}>) {
  try {
    const params = await searchParams;
    const pipelines = await get<Pipeline[]>("/pipelines");
    if (!pipelines.length)
      return (
        <div className="pipeline-page">
          <Alert tone="note">
            Crea tu primer pipeline y agrega sus etapas para comenzar.
          </Alert>
          <PipelineSettings pipelines={[]} pipelineId="" />
        </div>
      );
    const id =
      params?.pipelineId ??
      pipelines.find((p) => p.isDefault)?.id ??
      pipelines[0]!.id;
    const [board, contacts, companies, users] = await Promise.all([
      get<Board>("/deals/board?pipelineId=" + encodeURIComponent(id)),
      allOptions("/contacts", true),
      allOptions("/companies"),
      get<Option[]>("/pipeline/owners"),
    ]);
    return (
      <PipelineBoard
        key={board.pipeline.id}
        {...board}
        pipelines={pipelines}
        contacts={contacts}
        companies={companies}
        users={users}
      />
    );
  } catch (error) {
    unstable_rethrow(error);
    return (
      <div className="pipeline-page">
        <Alert tone="error">
          No pudimos cargar el pipeline y sus opciones. Intenta de nuevo en un
          momento.
        </Alert>
        <Link className="button button--secondary" href="/pipeline">
          Volver a cargar
        </Link>
      </div>
    );
  }
}
