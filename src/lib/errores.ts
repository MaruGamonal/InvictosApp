/**
 * Módulo central de errores (`10`, sección 8). Ningún servicio inventa
 * códigos sueltos: todo error de negocio se lanza con `crearError`, y la
 * capa de rutas (`src/app/`) es la única que traduce esto a HTTP.
 *
 * El `mensaje` es el texto que ve la persona: español rioplatense,
 * accionable, sin el nombre del código ni vocabulario del modelo de datos
 * (`08`, sección 8). El `codigo` es para el código y nunca se muestra crudo.
 */

export const CODIGOS_ERROR = {
  // Transversales (`10`, 8.1)
  NO_AUTENTICADO: {
    httpStatus: 401,
    mensaje: 'Necesitás iniciar sesión para hacer esto.',
  },
  SIN_PERMISO: {
    httpStatus: 403,
    mensaje: 'No tenés permiso para hacer esto.',
  },
  NO_ENCONTRADO: {
    httpStatus: 404,
    mensaje:
      'No encontramos lo que buscás. Puede que ya no esté disponible o que el link esté mal.',
  },
  DATOS_INVALIDOS: {
    httpStatus: 400,
    mensaje: 'Hay datos que faltan o que no tienen el formato esperado.',
  },
  CONFLICTO_DE_VERSION: {
    httpStatus: 409,
    mensaje: 'Alguien más actualizó esto mientras lo estabas editando. Recargá y probá de nuevo.',
  },
  ERROR_INTERNO: {
    httpStatus: 500,
    mensaje: 'Algo salió mal de nuestro lado. Probá de nuevo en un momento.',
  },

  // De negocio (`10`, 8.2)
  DATOS_MINIMOS_INCOMPLETOS: {
    httpStatus: 400,
    mensaje: 'Para publicar el torneo todavía falta completar algunos datos.',
  },
  ORGANIZACION_NO_VERIFICADA: {
    httpStatus: 409,
    mensaje:
      'Para que este torneo aparezca en las búsquedas, primero tenés que verificar tu organización confirmando tu email.',
  },
  LIMITE_TORNEOS_PUBLICADOS: {
    httpStatus: 409,
    mensaje:
      'Mientras tu organización no esté verificada, podés tener un solo torneo publicado a la vez.',
  },
  INSCRIPCIONES_CERRADAS: {
    httpStatus: 409,
    mensaje: 'Este torneo ya no está recibiendo inscripciones.',
  },
  CUPO_COMPLETO: {
    httpStatus: 409,
    mensaje: 'Este torneo ya completó su cupo de equipos.',
  },
  REGLAMENTO_NO_ACEPTADO: {
    httpStatus: 400,
    mensaje: 'Para inscribirte tenés que aceptar el reglamento del torneo.',
  },
  EXCEDE_MAXIMO_PLANTEL: {
    httpStatus: 409,
    mensaje: 'La lista supera la cantidad máxima de jugadores que permite este torneo.',
  },
  JUGADOR_YA_HABILITADO_EN_EL_TORNEO: {
    httpStatus: 409,
    mensaje: 'Este jugador ya está habilitado en otro equipo de este mismo torneo.',
  },
  INSCRIPCIONES_ABIERTAS: {
    httpStatus: 409,
    mensaje: 'No podés generar el fixture mientras las inscripciones sigan abiertas.',
  },
  FIXTURE_CON_PARTIDOS_JUGADOS: {
    httpStatus: 409,
    mensaje: 'Ya hay partidos jugados en este torneo: regenerar el fixture los afectaría.',
  },
  TORNEO_NO_EN_CURSO: {
    httpStatus: 409,
    mensaje: 'Este torneo no está en curso, así que todavía no se pueden cargar resultados.',
  },
  TORNEO_YA_EMPEZADO: {
    httpStatus: 409,
    mensaje: 'No podés cambiar el formato de un torneo que ya tiene partidos jugados.',
  },
  TRANSICION_NO_PERMITIDA: {
    httpStatus: 409,
    mensaje: 'El torneo no puede pasar a ese estado desde donde está ahora.',
  },
  EQUIPO_EN_TORNEO_EN_CURSO: {
    httpStatus: 409,
    mensaje: 'No podés archivar este equipo mientras compite en un torneo en curso.',
  },
  CAPITAN_SIN_REEMPLAZO: {
    httpStatus: 409,
    mensaje: 'Antes de dejar el equipo, tenés que designar a otra persona como capitán.',
  },
  ROL_TITULAR_NO_GESTIONABLE: {
    httpStatus: 403,
    mensaje: 'El rol de titular no se asigna ni se quita desde acá.',
  },
  ADMIN_NO_PUEDE_GESTIONAR_ADMINS: {
    httpStatus: 403,
    mensaje: 'Como administrador no podés agregar ni quitar otros administradores.',
  },
  PERFIL_YA_RECLAMADO: {
    httpStatus: 409,
    mensaje: 'Este perfil ya está asociado a una cuenta.',
  },
} as const;

export type CodigoError = keyof typeof CODIGOS_ERROR;

export class ErrorDeAplicacion extends Error {
  readonly codigo: CodigoError;
  readonly httpStatus: number;
  readonly detalle?: unknown;

  constructor(codigo: CodigoError, detalle?: unknown) {
    super(CODIGOS_ERROR[codigo].mensaje);
    this.name = 'ErrorDeAplicacion';
    this.codigo = codigo;
    this.httpStatus = CODIGOS_ERROR[codigo].httpStatus;
    this.detalle = detalle;
  }
}

/** Todo servicio que necesite fallar de una forma prevista lanza esto. */
export function crearError(codigo: CodigoError, detalle?: unknown): ErrorDeAplicacion {
  return new ErrorDeAplicacion(codigo, detalle);
}

export function esErrorDeAplicacion(error: unknown): error is ErrorDeAplicacion {
  return error instanceof ErrorDeAplicacion;
}
