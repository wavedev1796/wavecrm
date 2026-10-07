// Importación desde Excel o CSV (CRM-19): pantalla y formulario compartidos y lo propio de cada entidad.
// Las etiquetas de columna viven en importar/fields.ts junto a sus alias, que reflejan la lectura del API.

// Hoja "Instrucciones" de la plantilla Excel: qué escribir en cada columna (por `field`) y un ejemplo válido.
const TELEFONO = {
  ayuda:
    "Número de Ecuador tal como se marca, celular o fijo con su código de provincia. De otro país, empieza con + y el código del país (+57 300 123 4567).",
  ejemplo: "0987654321",
};
const PROVINCIA = {
  ayuda: "Elígela de la lista: una de las 24 provincias de Ecuador.",
  ejemplo: "Pichincha",
};
const CANTON = {
  ayuda:
    "Elígelo de la lista, que muestra los cantones de la provincia de esa misma fila: elige primero la provincia.",
  ejemplo: "Quito",
};
const ETIQUETAS = {
  ayuda:
    "Hasta 10, separadas por comas dentro de la celda. Cada una de 2 a 30 caracteres: letras, números, espacios y guiones.",
  ejemplo: "cliente, mayorista",
};

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
    instrucciones: {
      hoja: "Instrucciones",
      titulo: (varios: string) => `Cómo llenar la plantilla de ${varios}`,
      pasos: (hoja: string) => [
        `Escribe los datos en la hoja «${hoja}»: una fila por registro, desde la fila 2.`,
        "No cambies ni borres los nombres de las columnas: así Wave CRM reconoce cada dato.",
        "La cabecera azul oscuro marca las columnas obligatorias; la tabla de abajo dice qué va en cada una.",
        "Las columnas con lista desplegable (flecha en la celda) solo aceptan un valor de la lista. Si pegas datos de otro archivo, Excel no los revisa.",
      ],
      columnas: ["Columna", "¿Obligatoria?", "Qué escribir", "Ejemplo"],
      si: "Sí",
      no: "No",
      reglas: "Antes de importar",
    },
    // Hoja oculta con las opciones de las listas desplegables y el aviso al escribir un valor que no está.
    listas: {
      hoja: "Listas",
      columnas: ["Tipo de documento", "Provincia", "Provincia", "Cantón"],
      titulo: "Valor no válido",
      documentType: "Elige Cédula, RUC o Pasaporte de la lista.",
      province: "Elige una provincia de Ecuador de la lista.",
      city: "Elige un cantón de la lista. Si está vacía, elige primero la provincia de esta fila.",
    },
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
      "Nombre, apellido, tipo y número de documento son obligatorios, y al menos un teléfono o un correo; el resto de columnas es opcional.",
      "El tipo de documento es Cédula, RUC o Pasaporte. El cantón debe ser de la provincia de la fila.",
      "Separa las etiquetas con comas dentro de la celda. El RUC de la empresa debe ser de una empresa ya registrada.",
    ],
    uno: "contacto",
    varios: "contactos",
    hoja: "Contactos",
    columnas: {
      firstName: {
        ayuda:
          "Nombre o nombres de la persona, de 2 a 100 caracteres: letras, espacios, apóstrofos, guiones y puntos.",
        ejemplo: "Carla",
      },
      lastName: {
        ayuda: "Apellido o apellidos, con las mismas reglas que el nombre.",
        ejemplo: "Suárez",
      },
      documentType: {
        ayuda: "Elígelo de la lista: Cédula, RUC o Pasaporte.",
        ejemplo: "Cédula",
      },
      documentId: {
        ayuda:
          "Cédula de 10 dígitos, RUC de persona natural de 13 (su cédula seguida de 001) o pasaporte de 6 a 20 letras o números. No puede repetirse en otro contacto.",
        ejemplo: "1103040505",
      },
      email: {
        ayuda:
          "Correo de la persona, hasta 64 caracteres. Escribe al menos el correo o el teléfono.",
        ejemplo: "csuarez@comercialandina.ec",
        obligatoria: "Sí, o el teléfono",
      },
      phone: {
        ...TELEFONO,
        ayuda: `${TELEFONO.ayuda} Escribe al menos el teléfono o el correo.`,
        obligatoria: "Sí, o el correo",
      },
      province: PROVINCIA,
      city: CANTON,
      position: {
        ayuda: "Puesto de la persona en su empresa, hasta 100 caracteres.",
        ejemplo: "Jefa de compras",
      },
      tags: ETIQUETAS,
      companyTaxId: {
        ayuda:
          "RUC de una empresa ya registrada en Wave CRM. Déjalo vacío si la persona trabaja de forma independiente.",
        ejemplo: "1791234561001",
      },
    },
  },
  empresas: {
    titulo: "Importar empresas desde Excel o CSV",
    reglas: [
      "Nombre y RUC son obligatorios; el resto de columnas es opcional.",
      "Cada RUC debe ser válido y no estar registrado. Separa las etiquetas con comas dentro de la celda.",
    ],
    uno: "empresa",
    varios: "empresas",
    hoja: "Empresas",
    columnas: {
      name: {
        ayuda:
          "Nombre comercial, con el que se conoce a la empresa. De 2 a 120 caracteres.",
        ejemplo: "Comercial Andina",
      },
      legalName: {
        ayuda: "Nombre legal que figura en el RUC, hasta 160 caracteres.",
        ejemplo: "Comercial Andina Cía. Ltda.",
      },
      taxId: {
        ayuda:
          "RUC de 13 dígitos con dígito verificador válido. No puede estar registrado en otra empresa.",
        ejemplo: "1799663186001",
      },
      email: {
        ayuda: "Correo general de la empresa, hasta 64 caracteres.",
        ejemplo: "ventas@comercialandina.ec",
      },
      phone: { ...TELEFONO, ejemplo: "02 245 7812" },
      province: PROVINCIA,
      city: CANTON,
      tags: ETIQUETAS,
    },
  },
} as const;
