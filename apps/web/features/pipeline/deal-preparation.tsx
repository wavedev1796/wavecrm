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
  defaultTaxRate,
}: Readonly<{ deal: DealDetail; locked: boolean; defaultTaxRate: number }>) {
  const [hasUnsavedItems, setHasUnsavedItems] = useState(false);
  const router = useRouter();
  const reportDirty = useCallback(
    (dirty: boolean) => setHasUnsavedItems(dirty),
    [],
  );
  const itemsLocked = deal.status === "WON" || deal.status === "REJECTED";
  return (
    <div className="deal-preparation-grid">
      <DealItems
        key={deal.status + ":" + deal.items.map((item) => item.id).join(",")}
        dealId={deal.id}
        defaultTaxRate={defaultTaxRate}
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
    </div>
  );
}
