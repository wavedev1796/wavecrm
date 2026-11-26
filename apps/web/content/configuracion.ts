// Configuración general (solo ADMIN): hoy, el IVA con que arrancan los productos nuevos.

export const CONFIGURACION = {
  errorCarga: "No pudimos cargar la configuración. Recarga la página.",
  iva: {
    titulo: "IVA general",
    ayuda:
      "Es el IVA con que arrancan los productos nuevos de un negocio. Los productos ya guardados conservan su tarifa.",
    campo: "IVA general (%)",
    error: "El IVA debe ser un porcentaje entero entre 0 y 100.",
    sinCodigo: "Elige un IVA que Wave Billing acepte: 15, 8, 5 o 0.",
    guardar: "Guardar",
    guardado: "Configuración guardada.",
  },
} as const;
