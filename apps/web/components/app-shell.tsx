"use client";

import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  UserCog,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { UserRole } from "@wave/shared";
import { ROL_USUARIO } from "@/content/catalogos";
import { MARCA } from "@/content/comun";
import { NAVEGACION } from "@/content/navegacion";
import { initials } from "@/lib/format";
import { logout } from "@/app/(auth)/actions";
import { Input } from "./ui/input";

const navItems = [
  { href: "/pipeline", label: NAVEGACION.menu.pipeline, icon: LayoutDashboard },
  { href: "/contactos", label: NAVEGACION.menu.contactos, icon: Users },
  { href: "/empresas", label: NAVEGACION.menu.empresas, icon: Building2 },
  { href: "/cotizaciones", label: NAVEGACION.menu.cotizaciones, icon: FileText },
  { href: "/actividades", label: NAVEGACION.menu.actividades, icon: CalendarDays },
  { href: "/reportes", label: NAVEGACION.menu.reportes, icon: BarChart3 },
];

type ShellUser = {
  name: string;
  email: string;
  role: UserRole;
} | null;

function headerForPath(pathname: string) {
  const exact = NAVEGACION.cabeceras[pathname];
  if (exact) return exact;
  if (pathname.startsWith("/contactos/")) return NAVEGACION.fichaContacto;
  if (pathname.startsWith("/empresas/")) return NAVEGACION.fichaEmpresa;
  return NAVEGACION.porDefecto;
}

export function AppShell({
  children,
  user,
}: Readonly<{
  children: React.ReactNode;
  user: ShellUser;
}>) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const header = headerForPath(pathname);

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}
        aria-label={NAVEGACION.shell.navegacion}
      >
        <div className="brand-row">
          <span className="brand-logo" aria-hidden="true" />
          <span className="sr-only">{MARCA.nombre}</span>
          <span className="brand-tag">{MARCA.etiqueta}</span>
          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label={NAVEGACION.shell.cerrarMenu}
          >
            <X />
          </button>
        </div>

        <nav className="sidebar-nav">
          {[
            ...navItems,
            ...(user?.role === "ADMIN"
              ? [{ href: "/usuarios", label: NAVEGACION.menu.usuarios, icon: UserCog }]
              : []),
          ].map(({ href, label, icon: Icon }) => {
            // Las subrutas (/contactos/importar, fichas…) marcan su sección.
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={active ? "nav-link nav-link--active" : "nav-link"}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? "page" : undefined}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="goal-card">
          <span>{NAVEGACION.shell.metaDelMes}</span>
          <strong>
            $15.9k <small>/ $23k</small>
          </strong>
          <div className="goal-track">
            <span />
          </div>
        </div>

        <form className="profile-card" action={logout}>
          <span className="avatar">{initials(user?.name) || MARCA.inicial}</span>
          <span>
            <strong>{user?.name ?? NAVEGACION.shell.usuario}</strong>
            <small>
              {ROL_USUARIO[user?.role ?? "VENDEDOR"]}
            </small>
          </span>
          <button
            className="icon-button"
            type="submit"
            aria-label={NAVEGACION.shell.cerrarSesion}
            title={NAVEGACION.shell.cerrarSesion}
          >
            <LogOut aria-hidden="true" />
          </button>
        </form>
      </aside>

      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label={NAVEGACION.shell.cerrarMenu}
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={() => setMobileOpen(true)}
            aria-label={NAVEGACION.shell.abrirMenu}
          >
            <Menu />
          </button>
          <div className="page-heading">
            <h1>{header.title}</h1>
            <p>{header.subtitle}</p>
          </div>
          <label className="global-search">
            <Search aria-hidden="true" />
            <span className="sr-only">{NAVEGACION.shell.buscar}</span>
            <Input placeholder={NAVEGACION.shell.buscarPlaceholder} />
            <kbd>{NAVEGACION.shell.atajoBuscar}</kbd>
          </label>
          <button
            className="notification-button"
            aria-label={NAVEGACION.shell.pendientes}
          >
            <Activity />
            <span>3</span>
          </button>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}

