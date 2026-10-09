import Link from "next/link";
import "./pipeline.css";
import { unstable_rethrow } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { authenticatedApi, apiError } from "@/lib/authenticated-api";
import { PipelineBoard } from "./pipeline-board";
import { PipelineSettings } from "./pipeline-settings";
import type { Board, Option, Pipeline } from "./types";

async function get<T>(path: string): Promise<T> {
  const response = await authenticatedApi(path);
  if (!response.ok) throw new Error(await apiError(response));
  return response.json() as Promise<T>;
}
async function allOptions(path: string, contact = false): Promise<Option[]> {
  const options: Option[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await get<{
      data: Array<{
        id: string;
        name: string;
        firstName: string;
        lastName: string;
      }>;
      meta?: { totalPages: number };
    }>(path + "?limit=100&page=" + page);
    options.push(
      ...result.data.map((row) => ({
        id: row.id,
        name: contact ? row.firstName + " " + row.lastName : row.name,
      })),
    );
    totalPages = result.meta?.totalPages ?? 1;
    page++;
  } while (page <= totalPages);
  return options;
}
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
