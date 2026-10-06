// Pantallas de acceso (CRM-19): login, recuperar y restablecer contraseña y activar cuenta.
// El texto legal de los términos se queda en activar-cuenta/terms-consent.tsx (también existe como PDF).

export const ACCESO = {
  marco: {
    lema: "Tu operación comercial, siempre conectada.",
    descripcion:
      "Clientes, negocios y equipo en un solo lugar pensado para Ecuador.",
    pie: "© 2026 Wave · thewavesea.com",
    ilustracion: { marca: "Wave", lema: "Todo fluye" },
    // Tarjeta decorativa con un negocio de ejemplo.
    ejemplo: {
      etiqueta: "Ejemplo de un negocio en Wave CRM",
      tag: "Vista de ejemplo",
      etapa: "Negociación · 45 %",
      titulo: "Renovación de equipos",
      valor: "$4.200,00",
      ruc: "RUC 17•••••••001 · validado",
      cotizacion: "Cotización adjunta",
    },
  },
  campos: {
    correo: "Correo",
    correoPlaceholder: "tucorreo@empresa.ec",
    contrasena: "Contraseña",
    confirmarContrasena: "Confirmar contraseña",
    requisitos: "Requisitos de la contraseña",
    cumplido: " (cumplido)",
    pendiente: " (pendiente)",
  },
  volverAlLogin: "Volver al inicio de sesión",
  login: {
    titulo: "Iniciar sesión",
    eyebrow: "Bienvenido a Wave CRM",
    encabezado: "Inicia sesión en tu cuenta",
    lead: "Continúa donde lo dejaste y mantén a tu equipo al día.",
    avisos: {
      activada: "Tu cuenta fue activada. Ya puedes iniciar sesión.",
      contrasenaActualizada:
        "Tu contraseña fue actualizada. Inicia sesión con tu nueva contraseña.",
      sesionExpirada: "Tu sesión terminó. Vuelve a iniciar sesión.",
    },
    olvidaste: "¿Olvidaste tu contraseña?",
    entrar: "Entrar",
    entrando: "Entrando…",
    seguridad: "Acceso seguro para miembros autorizados de tu equipo.",
    errores: {
      credenciales: "Correo o contraseña incorrectos.",
      desactivada:
        "Tu cuenta está desactivada. Pide a un administrador que la reactive.",
      intentos: "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
      generico: "No pudimos iniciar sesión. Inténtalo de nuevo.",
      respuesta:
        "El servidor devolvió una respuesta inesperada. Avisa al equipo técnico.",
    },
  },
  recuperar: {
    titulo: "Recuperar contraseña",
    encabezado: "¿Olvidaste tu contraseña?",
    lead: "Escribe tu correo y te enviaremos un enlace para crear una nueva.",
    enviar: "Enviar enlace",
    enviando: "Enviando…",
    confirmacion: {
      encabezado: "Revisa tu correo",
      antes: "Si ",
      despues:
        " pertenece a una cuenta activa, recibirás un enlace para crear una contraseña nueva. Vence en una hora y solo puede usarse una vez.",
      registrada: "Solicitud registrada.",
    },
    errores: {
      intentos: "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
      generico: "No pudimos enviar el enlace. Inténtalo de nuevo.",
    },
  },
  restablecer: {
    titulo: "Crear contraseña nueva",
    noDisponible: {
      encabezado: "Enlace no disponible",
      lead: "El enlace no existe, venció o ya fue utilizado. Pide uno nuevo desde «¿Olvidaste tu contraseña?».",
      pedirOtro: "Pedir un enlace nuevo",
    },
    encabezado: "Crea tu contraseña nueva",
    saludo: "Hola ",
    aviso: ". Al guardarla se cerrarán las sesiones abiertas de tu cuenta.",
    guardar: "Guardar contraseña",
    guardando: "Guardando…",
  },
  activar: {
    noDisponible: {
      encabezado: "Invitación no disponible",
      lead: "El enlace no existe, venció o ya fue utilizado. Pide a un administrador que envíe una nueva invitación.",
    },
    encabezado: "Activa tu cuenta",
    saludo: "Hola ",
    cuenta: ". Crea una contraseña para la cuenta ",
    activar: "Activar mi cuenta",
    activando: "Activando…",
    terminosObligatorios:
      "Debes leer y aceptar los términos y condiciones para activar tu cuenta.",
    terminos: {
      acepto: "Acepto los términos y condiciones y la política de privacidad",
      releer: "Volver a leer el documento",
      leer: "Leer antes de aceptar",
      aceptados: "Términos aceptados",
      documento: "Documento legal · Versión 1.0",
      tituloDialogo: "Términos y política de privacidad",
      cerrar: "Cerrar",
      fin: "Fin del documento",
      finDetalle: "Ya puedes aceptar y continuar con la activación.",
      abrirPdf: "Abrir PDF completo",
      leeHastaElFinal: "Lee hasta el final para continuar",
      aceptar: "Aceptar y continuar",
    },
  },
} as const;
