import { ListPageSkeleton } from "@/components/layout/loading-skeletons";
import { CONTACTOS } from "@/content/contactos";

export default function ContactsLoading() {
  return (
    <ListPageSkeleton
      columns={CONTACTOS.listado.columnas}
      label={CONTACTOS.listado.cargando}
      withAvatar
    />
  );
}
