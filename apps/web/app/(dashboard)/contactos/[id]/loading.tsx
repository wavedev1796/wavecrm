import { DetailPageSkeleton } from "@/components/layout/loading-skeletons";
import { CONTACTOS } from "@/content/contactos";

export default function ContactDetailLoading() {
  return <DetailPageSkeleton label={CONTACTOS.ficha.cargando} />;
}
