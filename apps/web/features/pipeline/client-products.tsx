import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PRODUCTOS_CLIENTE } from "@/content/pipeline";
import { formatDay } from "@/lib/format";
import type { JourneyDeal } from "./types";

type Bought = { key: string; description: string; quantity: number; deals: number; last: string };
const quantity = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 });

/**
 * P13: productos de los negocios ganados, agrupados por descripción (sin distinguir mayúsculas), con la
 * cantidad total, cuántos negocios los incluyen y el cierre más reciente. Primero lo último que se compró.
 */
export function wonProducts(deals: readonly JourneyDeal[]): Bought[] {
  const groups = new Map<string, Bought>();
  for (const deal of deals) {
    if (deal.status !== "WON") continue;
    const counted = new Set<string>();
    for (const item of deal.items ?? []) {
      const description = item.description.trim();
      const key = description.toLocaleLowerCase("es");
      const group = groups.get(key) ?? { key, description, quantity: 0, deals: 0, last: "" };
      group.quantity += Number(item.quantity);
      if (!counted.has(key)) group.deals += 1;
      counted.add(key);
      // closedAt es ISO: el orden de texto es el de las fechas.
      if ((deal.closedAt ?? "") > group.last) group.last = deal.closedAt ?? "";
      groups.set(key, group);
    }
  }
  return [...groups.values()].sort((a, b) => b.last.localeCompare(a.last) || a.description.localeCompare(b.description, "es"));
}

/** Tarjeta de la ficha del contacto o de la empresa con lo que ya compró en negocios ganados. */
export function ClientProducts({ deals }: Readonly<{ deals: readonly JourneyDeal[] }>) {
  const products = wonProducts(deals);
  const texto = PRODUCTOS_CLIENTE;
  return (
    <Card className="contact-related">
      <h3>
        <Package />
        {texto.titulo} <Badge tone="blue">{products.length}</Badge>
      </h3>
      {products.length ? (
        products.map((product) => (
          <article key={product.key}>
            <div>
              <strong>{product.description}</strong>
              <span>
                {[texto.negocios(product.deals), product.last && texto.ultimo(formatDay(product.last))]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <b>{texto.cantidad(quantity.format(product.quantity))}</b>
          </article>
        ))
      ) : (
        <p>{texto.vacio}</p>
      )}
    </Card>
  );
}
