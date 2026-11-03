import { NextResponse } from "next/server";
import { cancelActivity, completeActivity, deleteActivity } from "@/features/actividades/actions";

type Context = { params: Promise<{ id: string; action: string }> };

export async function PATCH(_request: Request, { params }: Context) {
  const { id, action } = await params;
  if (action !== "complete" && action !== "cancel")
    return NextResponse.json({ error: { message: "Acción no válida." } }, { status: 404 });
  const result = action === "complete"
    ? await completeActivity(id)
    : await cancelActivity(id);
  return NextResponse.json(result);
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id, action } = await params;
  if (action !== "delete")
    return NextResponse.json({ error: { message: "Acción no válida." } }, { status: 404 });
  return NextResponse.json(await deleteActivity(id));
}
