import Link from "next/link";
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
    const query = params?.pipelineId
      ? "?pipelineId=" + encodeURIComponent(params.pipelineId)
      : "";
    // En paralelo: sin pipelineId el API abre el principal. Sin pipelines, el 404 del tablero no importa.
    const [options, board] = await Promise.allSettled([
      dealFormOptions(),
      get<Board>("/deals/board" + query),
    ]);
    if (options.status === "rejected") throw options.reason;
    if (!options.value.pipelines.length)
      return (
        <div className="pipeline-page">
          <Alert tone="note">
            Crea tu primer pipeline y agrega sus etapas para comenzar.
          </Alert>
          <PipelineSettings pipelines={[]} pipelineId="" />
        </div>
      );
    if (board.status === "rejected") throw board.reason;
    return (
      <PipelineBoard
        key={board.value.pipeline.id}
        {...board.value}
        {...options.value}
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
