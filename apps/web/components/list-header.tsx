import { Upload } from "lucide-react";
import Link from "next/link";

type Props = Readonly<{
  icon: React.ReactNode;
  title: string;
  summary: string;
  importHref: string;
  children: React.ReactNode;
}>;

/** Cabecera de un directorio (Contactos, Empresas): título, conteo, "Importar CSV" y la acción de alta. */
export function ListHeader({
  icon,
  title,
  summary,
  importHref,
  children,
}: Props) {
  return (
    <header className="contact-list-header">
      <div className="contact-list-title">
        <span className="contact-list-mark">{icon}</span>
        <div>
          <span>Directorio comercial</span>
          <h2>{title}</h2>
          <p>{summary}</p>
        </div>
      </div>
      <div className="contact-list-actions">
        <Link className="button button--secondary" href={importHref}>
          <Upload aria-hidden />
          Importar CSV
        </Link>
        {children}
      </div>
    </header>
  );
}
