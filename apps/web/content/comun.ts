// Textos compartidos por toda la web (CRM-19). Las pruebas siguen escribiendo el texto literal:
// así un cambio involuntario aquí se detecta.

export const MARCA = {
  nombre: "Wave",
  etiqueta: "CRM",
  inicial: "W",
  titulo: "Wave CRM",
  plantillaTitulo: "%s · Wave CRM",
  descripcion: "Gestión comercial para el equipo de Wave.",
} as const;

export const COMUN = {
  sinDato: "—",
  proximoSprint: "Disponible en el próximo sprint",
  errores: {
    conexion: "No pudimos conectar con el servidor. Inténtalo de nuevo.",
    operacion: "No pudimos completar la operación.",
  },
  directorio: {
    etiqueta: "Directorio comercial",
    importar: "Importar",
  },
  filtros: {
    provincia: "Filtrar por provincia",
    todasLasProvincias: "Todas las provincias",
    etiqueta: "Filtrar por etiqueta",
    etiquetaPlaceholder: "Etiqueta",
    aplicar: "Aplicar filtros",
    limpiar: "Limpiar",
  },
  formulario: {
    provincia: "Provincia",
    sinProvincia: "Sin provincia",
    canton: "Cantón",
    sinCanton: "Sin cantón",
    eligeProvincia: "Elige una provincia",
    telefono: "Teléfono",
    paisTelefono: "País del teléfono",
    mostrarContrasena: "Mostrar contraseña",
  },
  paginacion: {
    rango: (desde: number, hasta: number, total: number) =>
      `Mostrando ${desde}–${hasta} de ${total}`,
    vacia: (total: number) => `Mostrando 0 de ${total}`,
    pagina: (pagina: number, paginas: number) =>
      `· Página ${pagina} de ${paginas}`,
    anterior: "Anterior",
    siguiente: "Siguiente",
  },
} as const;
