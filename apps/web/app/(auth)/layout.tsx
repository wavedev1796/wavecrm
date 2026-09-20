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
            <span className="brand-logo" role="img" aria-label="Wave" />
            <span className="brand-tag">CRM</span>
          </div>
          <CrmIllustration />
          <div className="auth-pitch">
            <p className="auth-title">
              Tu operación comercial, siempre conectada.
            </p>
            <p>
              Clientes, negocios y equipo en un solo lugar pensado para Ecuador.
            </p>
          </div>
          <DealPreview />
        </aside>
      </div>
      <small className="auth-footer">© 2026 Wave · thewavesea.com</small>
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
        <strong>Wave</strong>
        <span>Todo fluye</span>
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
    <div
      className="deal-preview"
      role="img"
      aria-label="Ejemplo de un negocio en Wave CRM"
    >
      <div className="deal-preview-head">
        <span className="deal-preview-tag">Vista de ejemplo</span>
        <span className="deal-preview-stage">Negociación · 45 %</span>
      </div>
      <strong>Renovación de equipos</strong>
      <b>$4.200,00</b>
      <ul>
        <li>
          <CircleCheck aria-hidden />
          RUC 17•••••••001 · validado
        </li>
        <li>
          <FileText aria-hidden />
          Cotización adjunta
        </li>
      </ul>
      <div className="deal-preview-stages">
        <i className="is-done" />
        <i className="is-done" />
        <i />
        <i />
      </div>
    </div>
  );
}
