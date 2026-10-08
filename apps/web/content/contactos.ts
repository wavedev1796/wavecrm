// Contactos: listado, ficha, formulario y diálogo. La importación está en content/importacion.ts.

export const CONTACTOS = {
  listado: {
    titulo: "Todos los contactos",
    resumenSinDatos: "Consulta y organiza tu cartera",
    total: (n: number) =>
      n === 1 ? "1 contacto registrado" : `${n} contactos registrados`,
    buscar: {
      etiqueta: "Buscar contacto",
      placeholder: "Buscar por nombre, empresa, documento o RUC",
    },
    // Arreglo en el orden de la tabla: lo reutiliza el esqueleto de carga.
    columnas: ["Contacto", "Empresa", "Provincia", "Etiquetas", "Responsable"],
    sinResultados: "No hay contactos que coincidan con los filtros.",
    errorCarga: "No pudimos cargar los contactos. Recarga la página.",
    paginacion: "Paginación de contactos",
    sinAsignar: "Sin asignar",
  },
  ficha: {
    errorCarga: "No pudimos cargar el contacto.",
    volver: "← Volver a contactos",
    etiqueta: "Ficha de contacto",
    sinCargo: "Sin cargo",
    datos: "Datos del contacto",
    campos: {
      correo: "Correo",
      telefono: "Teléfono",
      documento: "Documento",
      ubicacion: "Ubicación",
      responsable: "Responsable",
    },
    negocios: "Negocios",
    sinNegocios: "No hay negocios vinculados.",
    actividades: "Actividades",
    sinActividades: "No hay actividades vinculadas.",
    sinFecha: "Sin fecha",
  },
  formulario: {
    editar: "Editar contacto",
    nuevo: "Nuevo contacto",
    ayuda:
      "Los campos con * son obligatorios, además de un teléfono o un correo. Los datos se validan al guardar.",
    campos: {
      nombre: "Nombre",
      apellido: "Apellido",
      tipoDocumento: "Tipo de documento",
      correo: "Correo",
      correoPlaceholder: "persona@empresa.ec",
      cargo: "Cargo",
      etiquetas: "Etiquetas",
      etiquetasPlaceholder: "cliente, vip",
    },
    empresa: {
      etiqueta: "Empresa donde trabaja (opcional)",
      placeholder: "Busca por nombre o RUC",
      ayuda: "Déjalo vacío si trabaja de forma independiente.",
    },
    cancelar: "Cancelar",
    guardar: "Guardar cambios",
    crear: "Crear contacto",
    errores: {
      empresa: "Elige una empresa de la lista o deja el campo vacío.",
      cargo: "El cargo no puede superar 100 caracteres.",
      // Mismo texto que el API (CONTACT_METHOD_REQUIRED): un contacto necesita teléfono o correo.
      contacto: "Ingresa un teléfono o un correo.",
    },
    actualizado: "Contacto actualizado.",
    creado: "Contacto creado.",
  },
  dialogo: {
    abrir: "Nuevo contacto",
    etiqueta: "Crear nuevo contacto",
    cerrar: "Cerrar nuevo contacto",
  },
} as const;
