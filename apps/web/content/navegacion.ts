// Menú, cabecera de cada ruta y textos del shell. Los iconos siguen en app-shell.tsx.

type Cabecera = { title: string; subtitle: string };

// Demo: dato inventado, reemplazar por datos reales.
const PIPELINE: Cabecera = {
  title: "Pipeline de ventas",
  subtitle: "Negocios, etapas y seguimiento comercial",
};

export const NAVEGACION = {
  menu: {
    pipeline: "Pipeline",
    contactos: "Contactos",
    empresas: "Empresas",
    cotizaciones: "Cotizaciones",
    actividades: "Actividades",
    reportes: "Reportes",
    usuarios: "Usuarios",
  },
  cabeceras: {
    "/pipeline": PIPELINE,
    // Demo: dato inventado, reemplazar por datos reales.
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
    "/usuarios": {
      title: "Usuarios",
      subtitle: "Cuentas y accesos del equipo",
    },
  } as Record<string, Cabecera>,
  fichaContacto: {
    title: "Ficha de contacto",
    subtitle: "Datos, negocios y actividades",
  },
  fichaEmpresa: {
    title: "Ficha de empresa",
    subtitle: "Contactos, negocios e historial",
  },
  porDefecto: PIPELINE,
  shell: {
    navegacion: "Navegación principal",
    abrirMenu: "Abrir menú",
    cerrarMenu: "Cerrar menú",
    cerrarSesion: "Cerrar sesión",
    buscar: "Buscar",
    buscarPlaceholder: "Buscar en Wave…",
    atajoBuscar: "⌘ K",
    pendientes: "Actividades pendientes",
    usuario: "Usuario",
    metaDelMes: "Meta del mes",
  },
  secciones: {
    actividades: {
      title: "Agenda comercial",
      description:
        "Llamadas, reuniones, correos y tareas del equipo en un solo lugar.",
    },
    cotizaciones: {
      title: "Cotizaciones",
      description:
        "Propuestas vinculadas a negocios y seguimiento de aceptación.",
    },
    reportes: {
      title: "Reportes comerciales",
      description:
        "Métricas del pipeline, conversión y rendimiento por responsable.",
    },
  },
} as const;
