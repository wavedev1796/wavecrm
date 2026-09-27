import { Badge } from "@/components/ui/badge";

/** Etiquetas de una fila, o "—" si no tiene. */
export function TagList({ tags }: Readonly<{ tags: string[] }>) {
  return (
    <div className="contact-tags">
      {tags.length
        ? tags.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))
        : "—"}
    </div>
  );
}
