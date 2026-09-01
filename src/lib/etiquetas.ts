/**
 * Fuente de verdad de qué etiqueta visible y qué color semántico le
 * corresponde a cada valor de enumeración (`04`, catálogo completo — la
 * columna "Color" de cada sección, resumida además en `04`, sección 6).
 *
 * Nadie reinterpreta esto ni adivina de qué color va un badge (`10`,
 * LEEME): la interfaz nunca muestra un valor técnico ni vocabulario del
 * modelo de datos (`08`, sección 8). Roles, tipos y motivos que `04` no
 * clasifica con un color (son etiquetas, no estados) llevan `color:
 * 'neutro'` acá por default de presentación — no porque el catálogo lo
 * diga, sino porque un chip sin color no es una opción de diseño.
 */

export type ColorSemantico = 'exito' | 'informacion' | 'advertencia' | 'error' | 'neutro';

export interface Etiqueta {
  etiqueta: string;
  color: ColorSemantico;
}

type Campo =
  | 'usuario.estado'
  | 'miembroOrganizacion.rol'
  | 'perfilDeportivo.estadoReclamo'
  | 'perfilDeportivo.visibilidad'
  | 'perfilDeportivo.posicion'
  | 'integranteEquipo.rolEquipo'
  | 'integranteEquipo.estadoVinculo'
  | 'integranteHabilitado.rolEnTorneo'
  | 'integranteHabilitado.estado'
  | 'colaboradorTorneo.estado'
  | 'organizacion.nivelVerificacion'
  | 'torneo.estado'
  | 'torneo.formato'
  | 'torneo.categoriaEdad'
  | 'torneo.categoriaGenero'
  | 'torneo.modalidad'
  | 'torneo.motivoCancelacion'
  | 'fase.tipoFase'
  | 'inscripcion.estado'
  | 'inscripcion.motivoEstado'
  | 'partido.estado'
  | 'partido.estadoResultado'
  | 'eventoPartido.tipoEvento'
  | 'disputaResultado.estado'
  | 'scoreEquipo.estado'
  | 'seguimiento.tipoSeguido'
  | 'reglamento.estado'
  | 'notificacion.canal'
  | 'notificacion.tipo';

const CATALOGO: Record<Campo, Record<string, Etiqueta>> = {
  'usuario.estado': {
    invited: { etiqueta: 'Invitado', color: 'advertencia' },
    active: { etiqueta: 'Activo', color: 'exito' },
    inactive: { etiqueta: 'Inactivo', color: 'neutro' },
  },
  'miembroOrganizacion.rol': {
    owner: { etiqueta: 'Titular', color: 'neutro' },
    admin: { etiqueta: 'Administrador', color: 'neutro' },
  },
  'perfilDeportivo.estadoReclamo': {
    unclaimed: { etiqueta: 'Sin reclamar', color: 'neutro' },
    pending: { etiqueta: 'Reclamo pendiente', color: 'advertencia' },
    claimed: { etiqueta: 'Reclamado', color: 'exito' },
  },
  'perfilDeportivo.visibilidad': {
    public: { etiqueta: 'Público', color: 'exito' },
    restricted: { etiqueta: 'Restringido', color: 'neutro' },
  },
  'perfilDeportivo.posicion': {
    goalkeeper: { etiqueta: 'Arquero', color: 'neutro' },
    defender: { etiqueta: 'Defensor', color: 'neutro' },
    midfielder: { etiqueta: 'Mediocampista', color: 'neutro' },
    forward: { etiqueta: 'Delantero', color: 'neutro' },
    unspecified: { etiqueta: 'Sin especificar', color: 'neutro' },
  },
  'integranteEquipo.rolEquipo': {
    captain: { etiqueta: 'Capitán', color: 'neutro' },
    delegate: { etiqueta: 'Delegado', color: 'neutro' },
    player: { etiqueta: 'Jugador', color: 'neutro' },
    coach: { etiqueta: 'DT / Cuerpo técnico', color: 'neutro' },
  },
  'integranteEquipo.estadoVinculo': {
    invited: { etiqueta: 'Invitación pendiente', color: 'advertencia' },
    requested: { etiqueta: 'Solicitud pendiente', color: 'advertencia' },
    active: { etiqueta: 'En el plantel', color: 'exito' },
    left: { etiqueta: 'Dejó el equipo', color: 'neutro' },
    declined: { etiqueta: 'Rechazó', color: 'neutro' },
    cancelled: { etiqueta: 'Cancelada', color: 'neutro' },
  },
  'integranteHabilitado.rolEnTorneo': {
    player: { etiqueta: 'Jugador', color: 'neutro' },
    coach: { etiqueta: 'Cuerpo técnico', color: 'neutro' },
    delegate: { etiqueta: 'Delegado', color: 'neutro' },
  },
  'integranteHabilitado.estado': {
    eligible: { etiqueta: 'Habilitado', color: 'exito' },
    unavailable: { etiqueta: 'Dado de baja', color: 'neutro' },
    suspended: { etiqueta: 'Suspendido', color: 'advertencia' },
  },
  'colaboradorTorneo.estado': {
    invited: { etiqueta: 'Invitado', color: 'advertencia' },
    active: { etiqueta: 'Activo', color: 'exito' },
    removed: { etiqueta: 'Sin acceso', color: 'neutro' },
  },
  'organizacion.nivelVerificacion': {
    unverified: { etiqueta: 'Sin verificar', color: 'neutro' },
    basic: { etiqueta: 'Verificado', color: 'exito' },
    trusted: { etiqueta: 'Verificado con distintivo', color: 'exito' },
  },
  'torneo.estado': {
    draft: { etiqueta: 'Borrador', color: 'neutro' },
    registration_open: { etiqueta: 'Inscripciones abiertas', color: 'exito' },
    registration_closed: { etiqueta: 'Inscripciones cerradas', color: 'informacion' },
    in_progress: { etiqueta: 'En curso', color: 'exito' },
    finished: { etiqueta: 'Finalizado', color: 'neutro' },
    suspended: { etiqueta: 'Suspendido', color: 'advertencia' },
    cancelled: { etiqueta: 'Cancelado', color: 'error' },
  },
  'torneo.formato': {
    league: { etiqueta: 'Liga (todos contra todos)', color: 'neutro' },
    knockout: { etiqueta: 'Eliminación directa', color: 'neutro' },
    groups_knockout: { etiqueta: 'Grupos + eliminatoria', color: 'neutro' },
  },
  'torneo.categoriaEdad': {
    open: { etiqueta: 'Libre', color: 'neutro' },
    u13: { etiqueta: 'Sub 13', color: 'neutro' },
    u15: { etiqueta: 'Sub 15', color: 'neutro' },
    u17: { etiqueta: 'Sub 17', color: 'neutro' },
    u20: { etiqueta: 'Sub 20', color: 'neutro' },
    veterans_35: { etiqueta: 'Veteranos +35', color: 'neutro' },
    veterans_45: { etiqueta: 'Veteranos +45', color: 'neutro' },
  },
  'torneo.categoriaGenero': {
    male: { etiqueta: 'Masculino', color: 'neutro' },
    female: { etiqueta: 'Femenino', color: 'neutro' },
    mixed: { etiqueta: 'Mixto', color: 'neutro' },
  },
  'torneo.modalidad': {
    f5: { etiqueta: 'Fútbol 5', color: 'neutro' },
    f7: { etiqueta: 'Fútbol 7', color: 'neutro' },
    f8: { etiqueta: 'Fútbol 8', color: 'neutro' },
    f9: { etiqueta: 'Fútbol 9', color: 'neutro' },
    f11: { etiqueta: 'Fútbol 11', color: 'neutro' },
  },
  'torneo.motivoCancelacion': {
    insufficient_teams: { etiqueta: 'No se llegó a los equipos necesarios', color: 'neutro' },
    venue_unavailable: { etiqueta: 'Sin cancha disponible', color: 'neutro' },
    weather: { etiqueta: 'Suspendido por clima', color: 'neutro' },
    organizer_decision: { etiqueta: 'Decisión del organizador', color: 'neutro' },
    other: { etiqueta: 'Otro', color: 'neutro' },
  },
  'fase.tipoFase': {
    league: { etiqueta: 'Fase de liga', color: 'neutro' },
    knockout: { etiqueta: 'Fase eliminatoria', color: 'neutro' },
  },
  'inscripcion.estado': {
    pending: { etiqueta: 'Pendiente', color: 'advertencia' },
    approved: { etiqueta: 'Aprobada', color: 'exito' },
    rejected: { etiqueta: 'Rechazada', color: 'error' },
    withdrawn: { etiqueta: 'Retirada', color: 'neutro' },
    excluded: { etiqueta: 'Excluida', color: 'error' },
    waitlisted: { etiqueta: 'En lista de espera', color: 'informacion' },
  },
  'inscripcion.motivoEstado': {
    withdrew: { etiqueta: 'El equipo se retiró', color: 'neutro' },
    no_show: { etiqueta: 'No se presentó', color: 'neutro' },
    roster_incomplete: { etiqueta: 'No completó el plantel', color: 'neutro' },
    disciplinary: { etiqueta: 'Sanción', color: 'neutro' },
    other: { etiqueta: 'Otro', color: 'neutro' },
  },
  'partido.estado': {
    unscheduled: { etiqueta: 'Sin programar', color: 'neutro' },
    scheduled: { etiqueta: 'Programado', color: 'informacion' },
    played: { etiqueta: 'Jugado', color: 'exito' },
    walkover: { etiqueta: 'Ganado por presentación', color: 'advertencia' },
    postponed: { etiqueta: 'Suspendido', color: 'advertencia' },
    cancelled: { etiqueta: 'Anulado', color: 'error' },
  },
  'partido.estadoResultado': {
    pending: { etiqueta: 'Sin cargar', color: 'advertencia' },
    loaded: { etiqueta: 'Cargado', color: 'informacion' },
    confirmed: { etiqueta: 'Confirmado', color: 'exito' },
    disputed: { etiqueta: 'En disputa', color: 'error' },
  },
  'eventoPartido.tipoEvento': {
    goal: { etiqueta: 'Gol', color: 'neutro' },
    own_goal: { etiqueta: 'Gol en contra', color: 'neutro' },
    yellow_card: { etiqueta: 'Tarjeta amarilla', color: 'advertencia' },
    red_card: { etiqueta: 'Tarjeta roja', color: 'error' },
  },
  'disputaResultado.estado': {
    open: { etiqueta: 'Abierta', color: 'advertencia' },
    upheld: { etiqueta: 'Resuelta a favor', color: 'exito' },
    rejected: { etiqueta: 'Desestimada', color: 'neutro' },
    withdrawn: { etiqueta: 'Retirada', color: 'neutro' },
  },
  'scoreEquipo.estado': {
    insufficient_activity: { etiqueta: 'Sin score todavía', color: 'neutro' },
    active: { etiqueta: 'Vigente', color: 'exito' },
    stale: { etiqueta: 'Desactualizado', color: 'informacion' },
  },
  'seguimiento.tipoSeguido': {
    tournament: { etiqueta: 'Torneo', color: 'neutro' },
    team: { etiqueta: 'Equipo', color: 'neutro' },
    player: { etiqueta: 'Jugador', color: 'neutro' },
  },
  'reglamento.estado': {
    current: { etiqueta: 'Vigente', color: 'exito' },
    superseded: { etiqueta: 'Reemplazada', color: 'neutro' },
  },
  'notificacion.canal': {
    in_app: { etiqueta: 'Dentro del producto', color: 'neutro' },
    email: { etiqueta: 'Email', color: 'neutro' },
  },
  'notificacion.tipo': {
    team_invitation: { etiqueta: 'Te invitaron a un equipo', color: 'advertencia' },
    team_join_requested: { etiqueta: 'Alguien quiere sumarse a tu equipo', color: 'advertencia' },
    team_join_resolved: { etiqueta: 'Resolvieron tu solicitud', color: 'advertencia' },
    registration_received: { etiqueta: 'Nueva inscripción en tu torneo', color: 'advertencia' },
    registration_resolved: { etiqueta: 'Resolvieron tu inscripción', color: 'advertencia' },
    roster_required: { etiqueta: 'Falta confirmar tu plantel', color: 'advertencia' },
    match_scheduled: { etiqueta: 'Se programó tu partido', color: 'advertencia' },
    match_rescheduled: { etiqueta: 'Cambió el horario de tu partido', color: 'advertencia' },
    result_pending_confirmation: {
      etiqueta: 'Confirmá el resultado de tu partido',
      color: 'advertencia',
    },
    result_disputed: { etiqueta: 'Objetaron un resultado de tu torneo', color: 'advertencia' },
    tournament_published: {
      etiqueta: 'Se publicó un torneo que puede interesarte',
      color: 'neutro',
    },
    tournament_started: { etiqueta: 'Empezó un torneo que seguís', color: 'neutro' },
    tournament_finished: { etiqueta: 'Terminó un torneo que seguís', color: 'neutro' },
    tournament_cancelled: { etiqueta: 'Se canceló un torneo que seguís', color: 'advertencia' },
    tournament_rules_updated: {
      etiqueta: 'Cambió el reglamento de tu torneo',
      color: 'advertencia',
    },
    result_published: { etiqueta: 'Nuevo resultado en un torneo que seguís', color: 'neutro' },
  },
};

/**
 * Etiqueta visible y color semántico de un valor técnico. Lanza si se le
 * pide un campo o un valor que no está en el catálogo — mismo criterio
 * que `04`, sección 9: nada se muestra sin haber sido dado de alta acá
 * primero.
 */
export function obtenerEtiqueta(campo: Campo, valorTecnico: string): Etiqueta {
  const etiqueta = CATALOGO[campo]?.[valorTecnico];
  if (!etiqueta) {
    throw new Error(
      `No hay etiqueta registrada para ${campo} = "${valorTecnico}" (ver 04, catálogo)`,
    );
  }
  return etiqueta;
}

/** Todo el catálogo, aplanado — para el catálogo visual de componentes (T6). */
export function listarTodasLasEtiquetas(): Array<{ campo: Campo; valor: string } & Etiqueta> {
  return (Object.keys(CATALOGO) as Campo[]).flatMap((campo) =>
    Object.entries(CATALOGO[campo]).map(([valor, etiqueta]) => ({ campo, valor, ...etiqueta })),
  );
}
