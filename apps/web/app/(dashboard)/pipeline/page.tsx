import Link from "next/link";
import "../../../styles/pipeline.css";
import { unstable_rethrow } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { PipelineBoard } from "../../../features/pipeline/pipeline-board";
import { PipelineSettings } from "../../../features/pipeline/pipeline-settings";
import { dealFormOptions, get } from "../../../features/pipeline/data";
import type { Board } from "../../../features/pipeline/types";

export default async function PipelinePage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<{ pipelineId?: string }>;
}>) {
  try {
    const params = await searchParams;
    const options = await dealFormOptions();
    const { pipelines } = options;
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
    const board = await get<Board>(
      "/deals/board?pipelineId=" + encodeURIComponent(id),
    );
    return <PipelineBoard key={board.pipeline.id} {...board} {...options} />;
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
