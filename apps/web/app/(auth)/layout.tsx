import {
  CircleCheck,
  CircleDollarSign,
  FileText,
  Handshake,
  Mail,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { ACCESO } from "@/content/acceso";
import { MARCA } from "@/content/comun";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="auth-screen">
      <div className="auth-ambient auth-ambient--one" aria-hidden />
      <div className="auth-ambient auth-ambient--two" aria-hidden />
      <div className="auth-frame">
        <main className="auth-main">{children}</main>
        <aside className="auth-aside">
          <div className="auth-brand">
            <span className="brand-logo" aria-hidden="true" />
            <span className="sr-only">{MARCA.nombre}</span>
            <span className="brand-tag">{MARCA.etiqueta}</span>
          </div>
          <CrmIllustration />
          <div className="auth-pitch">
            <p className="auth-title">{ACCESO.marco.lema}</p>
            <p>{ACCESO.marco.descripcion}</p>
          </div>
          <DealPreview />
        </aside>
      </div>
      <small className="auth-footer">{ACCESO.marco.pie}</small>
    </div>
  );
}

function CrmIllustration() {
  return (
    <div className="auth-visual" aria-hidden>
      <div className="auth-visual-glow" />
      <svg className="auth-network" viewBox="0 0 500 430">
        <path d="M250 205 118 118M250 205 382 105M250 205 414 265M250 205 112 300M250 205 245 58" />
        <circle cx="250" cy="205" r="118" />
        <circle cx="250" cy="205" r="164" />
      </svg>
      <div className="auth-visual-core">
        <Sparkles />
        <strong>{ACCESO.marco.ilustracion.marca}</strong>
        <span>{ACCESO.marco.ilustracion.lema}</span>
      </div>
      <VisualNode className="auth-node--mail" icon={Mail} />
      <VisualNode className="auth-node--people" icon={Users} />
      <VisualNode className="auth-node--deal" icon={Handshake} />
      <VisualNode className="auth-node--growth" icon={TrendingUp} />
      <VisualNode className="auth-node--chat" icon={MessageCircle} />
      <VisualNode className="auth-node--value" icon={CircleDollarSign} />
    </div>
  );
}

function VisualNode({
  className,
  icon: Icon,
}: Readonly<{
  className: string;
  icon: typeof Mail;
}>) {
  return (
    <span className={`auth-node ${className}`}>
      <Icon />
    </span>
  );
}

function DealPreview() {
  return (
    <section
      className="deal-preview"
      aria-label={ACCESO.marco.ejemplo.etiqueta}
    >
      <div className="deal-preview-head">
        <span className="deal-preview-tag">{ACCESO.marco.ejemplo.tag}</span>
        <span className="deal-preview-stage">
          {ACCESO.marco.ejemplo.etapa}
        </span>
      </div>
      <strong>{ACCESO.marco.ejemplo.titulo}</strong>
      <b>{ACCESO.marco.ejemplo.valor}</b>
      <ul>
        <li>
          <CircleCheck aria-hidden />
          {ACCESO.marco.ejemplo.ruc}
        </li>
        <li>
          <FileText aria-hidden />
          {ACCESO.marco.ejemplo.cotizacion}
        </li>
      </ul>
      <div className="deal-preview-stages">
        <i className="is-done" />
        <i className="is-done" />
        <i />
        <i />
      </div>
    </section>
  );
}
