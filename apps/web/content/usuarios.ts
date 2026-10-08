// Usuarios: resumen, invitación, filtros, tabla, edición y mensajes de las acciones.
// Los roles están en content/catalogos.ts y la paginación en content/comun.ts.

export type EstadoUsuario = "active" | "inactive" | "pending";

export const USUARIOS = {
  errorCarga: "No pudimos cargar los usuarios. Recarga la página.",
  resumen: {
    etiqueta: "Resumen de usuarios",
    total: "Total",
    activos: "Activos en página",
    pendientes: "Pendientes en página",
    inactivos: "Inactivos en página",
  },
  invitar: {
    titulo: "Invitar usuario",
    aviso:
      "La persona recibirá un enlace válido durante 48 horas para crear su contraseña.",
    nombre: "Nombre",
    nombrePlaceholder: "Nombre completo",
    correo: "Correo",
    correoPlaceholder: "persona@empresa.ec",
    rol: "Rol",
    enviar: "Enviar invitación",
  },
  filtros: {
    buscar: "Buscar usuario",
    buscarPlaceholder: "Nombre o correo…",
    estado: "Filtrar por estado",
    todos: "Todos los estados",
    activos: "Activos",
    pendientes: "Pendientes",
    inactivos: "Inactivos",
    filtrar: "Filtrar",
  },
  // Arreglo en el orden de la tabla: lo reutiliza el esqueleto de carga.
  columnas: ["Usuario", "Rol", "Estado", "Invitación", "Acciones"],
  estados: {
    active: "Activo",
    pending: "Invitación pendiente",
    inactive: "Inactivo",
  } as const satisfies Record<EstadoUsuario, string>,
  acciones: {
    editar: "Editar",
    editarA: (nombre: string) => `Editar ${nombre}`,
    reenviar: "Reenviar invitación",
    desactivar: "Desactivar",
    reactivar: "Reactivar",
    eliminar: "Eliminar",
  },
  sinResultados: "No hay usuarios que coincidan con el filtro.",
  paginacion: "Paginación de usuarios",
  editar: {
    etiqueta: "Administración de usuarios",
    titulo: "Editar usuario",
    descripcion: "Actualiza sus datos y el nivel de acceso al CRM.",
    cerrar: "Cerrar",
    nombre: "Nombre completo",
    correo: "Correo electrónico",
    rol: "Rol y permisos",
    rolAyuda: "Los administradores pueden gestionar usuarios, roles y accesos.",
    cancelar: "Cancelar",
    aplicar: "Aplicar cambios",
  },
  mensajes: {
    invitacionEnviada: "Invitación enviada.",
    actualizado: "Usuario actualizado.",
    desactivado: "Usuario desactivado.",
    reactivado: "Usuario reactivado.",
    invitacionReenviada: "Invitación reenviada.",
    eliminado: "Usuario eliminado.",
  },
} as const;
