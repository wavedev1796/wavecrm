export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-screen">
      <aside className="auth-aside">
        <div className="auth-brand">
          <span aria-hidden>W</span>
          <b>Wave CRM</b>
        </div>
        <div>
          <h2>
            El CRM hecho
            <br />
            para Ecuador.
          </h2>
          <p>
            Pipeline, contactos, cotizaciones y reportes en un solo lugar. Con validación de RUC y
            cédula, y montos en dólares.
          </p>
        </div>
        <small>© 2026 Wave · thewavesea.com</small>
      </aside>
      <main className="auth-main">{children}</main>
    </div>
  );
}
