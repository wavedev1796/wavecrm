"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { DealItems } from "./deal-items";
import { DealQuotes } from "./deal-quotes";
import type { DealDetail } from "./types";

/** Editor de líneas y revisión de cotización comparten el estado de cambios pendientes. */
export function DealPreparation({
  deal,
  locked,
}: Readonly<{ deal: DealDetail; locked: boolean }>) {
  const [hasUnsavedItems, setHasUnsavedItems] = useState(false);
  const router = useRouter();
  const reportDirty = useCallback(
    (dirty: boolean) => setHasUnsavedItems(dirty),
    [],
  );
  const itemsLocked = deal.status === "WON" || deal.status === "REJECTED";
  return (
    <>
      <DealItems
        key={deal.status + ":" + deal.items.map((item) => item.id).join(",")}
        dealId={deal.id}
        items={deal.items}
        locked={itemsLocked}
        onDirtyChange={reportDirty}
        onSaved={() => router.refresh()}
      />
      <DealQuotes
        deal={deal}
        locked={locked}
        hasUnsavedItems={hasUnsavedItems}
      />
    </>
  );
}
