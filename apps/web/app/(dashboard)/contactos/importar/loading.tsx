import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContactImportLoading() {
  return (
    <output aria-label="Cargando importación" className="loading-region">
      <span className="sr-only">Cargando importación</span>
      <Card className="skeleton-import-card" aria-hidden="true">
        <Skeleton className="skeleton-heading" />
        <Skeleton className="skeleton-summary" />
        <Skeleton className="skeleton-dropzone" />
        <Skeleton className="skeleton-button" />
      </Card>
    </output>
  );
}
