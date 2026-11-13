import {
  Activity,
  Bell,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardList,
  DollarSign,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Globe,
  Hash,
  IdCard,
  Lightbulb,
  ListOrdered,
  Lock,
  Mail,
  MapPin,
  Package,
  Palette,
  Percent,
  Phone,
  ShieldCheck,
  SquareKanban,
  Tag,
  Target,
  User,
  UserCheck,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

/**
 * Un icono por tipo de dato, para que el mismo dato tenga el mismo icono en todos los formularios
 * (modelo: «Registrar actividad» de la agenda). Se documenta en docs/design/TOKENS.md.
 */
export const FIELD_ICONS = {
  persona: User,
  responsable: Users,
  decisor: UserCheck,
  correo: Mail,
  telefono: Phone,
  documento: IdCard,
  cargo: Briefcase,
  etiquetas: Tag,
  empresa: Building2,
  sitio: Globe,
  ubicacion: MapPin,
  negocio: BriefcaseBusiness,
  dinero: DollarSign,
  fecha: CalendarDays,
  recordatorio: Bell,
  porcentaje: Percent,
  producto: Package,
  cantidad: Hash,
  pipeline: Workflow,
  etapa: SquareKanban,
  posicion: ListOrdered,
  color: Palette,
  tipo: Activity,
  asunto: ClipboardList,
  texto: FileText,
  necesidad: Target,
  solucion: Lightbulb,
  evidencia: FileCheck,
  archivo: FileSpreadsheet,
  contrasena: Lock,
  rol: ShieldCheck,
} satisfies Record<string, LucideIcon>;

export type FieldIconName = keyof typeof FIELD_ICONS;

/** Icono decorativo delante de la etiqueta: el nombre del campo lo da el texto, no el icono. */
export function FieldIcon({ name }: Readonly<{ name: FieldIconName }>) {
  const Icon = FIELD_ICONS[name];
  return <Icon aria-hidden className="field-icon" />;
}
