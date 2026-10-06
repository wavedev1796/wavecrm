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
import { initials } from "@/lib/format";
import { logout } from "@/app/(auth)/actions";
import { Input } from "./ui/input";

const navItems = [
  { href: "/pipeline", label: "Pipeline", icon: LayoutDashboard },
  { href: "/contactos", label: "Contactos", icon: Users },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/cotizaciones", label: "Cotizaciones", icon: FileText },
  { href: "/actividades", label: "Actividades", icon: CalendarDays },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
];

const titleByPath: Record<string, { title: string; subtitle: string }> = {
  "/pipeline": {
    title: "Pipeline de ventas",
    subtitle: "Quito, Ecuador · Septiembre 2026",
  },
  "/contactos": { title: "Contactos", subtitle: "248 contactos · 62 empresas" },
  "/contactos/importar": {
    title: "Importar contactos",
    subtitle: "Carga masiva desde Excel o CSV",
  },
  "/empresas": { title: "Empresas", subtitle: "Directorio comercial" },
  "/empresas/importar": {
    title: "Importar empresas",
    subtitle: "Carga masiva desde Excel o CSV",
  },
  "/cotizaciones": {
    title: "Cotizaciones",
    subtitle: "Propuestas y seguimiento",
  },
  "/actividades": { title: "Actividades", subtitle: "Agenda del equipo" },
  "/reportes": { title: "Reportes", subtitle: "Rendimiento comercial" },
  "/usuarios": { title: "Usuarios", subtitle: "Cuentas y accesos del equipo" },
};

type ShellUser = {
  name: string;
  email: string;
  role: UserRole;
} | null;

function headerForPath(pathname: string) {
  const exact = titleByPath[pathname];
  if (exact) return exact;
  if (pathname.startsWith("/contactos/")) {
    return {
      title: "Ficha de contacto",
      subtitle: "Datos, negocios y actividades",
    };
  }
  if (pathname.startsWith("/empresas/")) {
    return {
      title: "Ficha de empresa",
      subtitle: "Contactos, negocios e historial",
    };
  }
  return {
    title: "Pipeline de ventas",
    subtitle: "Quito, Ecuador · Septiembre 2026",
  };
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
        aria-label="Navegación principal"
      >
        <div className="brand-row">
          <span className="brand-logo" aria-hidden="true" />
          <span className="sr-only">Wave</span>
          <span className="brand-tag">CRM</span>
          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          >
            <X />
          </button>
        </div>

        <nav className="sidebar-nav">
          {[
            ...navItems,
            ...(user?.role === "ADMIN"
              ? [{ href: "/usuarios", label: "Usuarios", icon: UserCog }]
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
          <span>Meta del mes</span>
          <strong>
            $15.9k <small>/ $23k</small>
          </strong>
          <div className="goal-track">
            <span />
          </div>
        </div>

        <form className="profile-card" action={logout}>
          <span className="avatar">{initials(user?.name) || "W"}</span>
          <span>
            <strong>{user?.name ?? "Usuario"}</strong>
            <small>
              {ROL_USUARIO[user?.role ?? "VENDEDOR"]}
            </small>
          </span>
          <button
            className="icon-button"
            type="submit"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut aria-hidden="true" />
          </button>
        </form>
      </aside>

      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu />
          </button>
          <div className="page-heading">
            <h1>{header.title}</h1>
            <p>{header.subtitle}</p>
          </div>
          <label className="global-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Buscar</span>
            <Input placeholder="Buscar en Wave…" />
            <kbd>⌘ K</kbd>
          </label>
          <button
            className="notification-button"
            aria-label="Actividades pendientes"
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

