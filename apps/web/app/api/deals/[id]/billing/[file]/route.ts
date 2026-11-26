import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { FACTURACION } from "@/content/facturacion";
import { PIPELINE } from "@/content/pipeline";
import { apiError, authenticatedApi } from "@/lib/authenticated-api";

type Context = { params: Promise<{ id: string; file: string }> };

/** Archivos que se piden al API: RIDE (PDF) y XML. Cualquier otro nombre es 404 sin llamar al API. */
const FILES = ["ride", "xml"];

/** El PDF y el XML pasan por la web para llevar la sesión; solo se reenvían el tipo y la disposición. */
export async function GET(_request: Request, { params }: Context) {
  const { id, file } = await params;
  if (!FILES.includes(file)) return NextResponse.json({ error: FACTURACION.archivoNoEncontrado }, { status: 404 });
  try {
    const response = await authenticatedApi(`/deals/${encodeURIComponent(id)}/billing/${file}`);
    if (!response.ok) return NextResponse.json({ error: await apiError(response) }, { status: response.status });
    const headers = new Headers();
    for (const name of ["content-type", "content-disposition"]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(response.body, { headers });
  } catch (error) {
    unstable_rethrow(error);
    return NextResponse.json({ error: PIPELINE.connection }, { status: 502 });
  }
}
