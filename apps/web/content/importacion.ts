// Importación desde Excel o CSV (CRM-19): pantalla y formulario compartidos y lo propio de cada entidad.
// Las etiquetas de columna viven en importar/fields.ts junto a sus alias, que reflejan la lectura del API.

export const IMPORTACION = {
  intro:
    "Sube la hoja de Excel (.xlsx) o un CSV, elige qué columna corresponde a cada dato e impórtala. Si empiezas de cero, descarga la plantilla.",
  reglasComunes: [
    "En Excel, da formato de texto a las columnas de documento y teléfono antes de escribirlas: si no, se pierde el 0 inicial.",
    "Máximo 1 MB y 1000 filas por archivo. De un Excel se lee la primera hoja.",
    "Si alguna fila tiene errores no se guarda ninguna: corrige las filas indicadas y vuelve a subir el archivo.",
  ],
  plantilla: {
    excel: "Descargar plantilla Excel",
    csv: "Descargar plantilla CSV",
  },
  formulario: {
    archivo: "Archivo Excel o CSV",
    mapeo: "¿Qué columna del archivo corresponde a cada dato?",
    eligeColumna: "Elige una columna",
    noImportar: "No importar",
    importar: (sustantivo: string) => `Importar ${sustantivo}`,
    ver: (sustantivo: string) => `Ver ${sustantivo}`,
    errores: {
      excelIlegible:
        "No pudimos leer el archivo de Excel. Revisa que sea un .xlsx válido.",
      muyGrande: "El archivo supera 1 MB. Divídelo en partes más pequeñas.",
      sinCabecera: "El archivo no tiene una fila de cabecera.",
    },
    reporte: {
      etiqueta: "Errores por fila",
      columnas: ["Fila", "Columna", "Error"],
      ayuda:
        "Corrige esas filas en el archivo y vuelve a elegirlo para importarlo.",
    },
  },
  envio: {
    sinArchivo: "Adjunta un archivo Excel o CSV.",
    importados: (n: number, uno: string, varios: string) =>
      n === 1 ? `Se importó 1 ${uno}.` : `Se importaron ${n} ${varios}.`,
  },
  contactos: {
    titulo: "Importar contactos desde Excel o CSV",
    reglas: [
      "Nombre, apellido, tipo y número de documento son obligatorios; el resto de columnas es opcional.",
      "El tipo de documento es Cédula, RUC o Pasaporte. El cantón debe ser de la provincia de la fila.",
      "Separa las etiquetas con comas dentro de la celda. El RUC de la empresa debe ser de una empresa ya registrada.",
    ],
    uno: "contacto",
    varios: "contactos",
  },
  empresas: {
    titulo: "Importar empresas desde Excel o CSV",
    reglas: [
      "Nombre y RUC son obligatorios; el resto de columnas es opcional.",
      "Cada RUC debe ser válido y no estar registrado. Separa las etiquetas con comas dentro de la celda.",
    ],
    uno: "empresa",
    varios: "empresas",
  },
} as const;
