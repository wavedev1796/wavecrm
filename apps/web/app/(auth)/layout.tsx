import { BadgeCheck, CircleCheck, FileText, SquareKanban } from 'lucide-react';

const BENEFITS = [
  { icon: BadgeCheck, text: 'Validación de RUC y cédula' },
  { icon: SquareKanban, text: 'Pipeline por etapas con montos en USD' },
  { icon: FileText, text: 'Cotizaciones dentro de cada negocio' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-screen">
      <aside className="auth-aside">
        <svg className="auth-waves" viewBox="0 0 600 240" preserveAspectRatio="none" aria-hidden>
          <path d="M0 150 C120 90 240 210 360 150 S540 90 600 130" />
          <path d="M0 192 C140 132 260 240 400 182 S560 142 600 172" />
        </svg>
        <div className="auth-brand">
          <span className="brand-logo" role="img" aria-label="Wave" />
          <span className="brand-tag">CRM</span>
        </div>
        <div className="auth-pitch">
          {/* Párrafo y no h2: el primer encabezado de la página es el h1 del formulario. */}
          <p className="auth-title">
            El CRM hecho
            <br />
            para Ecuador.
          </p>
          <p>Sabe cómo atender tu negocio y mantener a tu equipo siempre al día.</p>
          <ul className="auth-benefits">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span>
                  <Icon aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <DealPreview />
      </aside>
      <main className="auth-main">{children}</main>
      <small className="auth-footer">© 2026 Wave · thewavesea.com</small>
    </div>
  );
}

// ponytail: datos inventados con etiqueta visible; no son métricas de clientes (PRODUCT.md).
function DealPreview() {
  return (
    <div className="deal-preview" aria-hidden>
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
