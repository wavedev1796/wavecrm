import { UsersPageSkeleton } from "@/components/layout/loading-skeletons";
import { USUARIOS } from "@/content/usuarios";

export default function UsersLoading() {
  return <UsersPageSkeleton columns={USUARIOS.columnas} label={USUARIOS.cargando} />;
}
