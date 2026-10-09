import type { GestionTorneoResultado } from '@/services/torneos/obtenerGestionTorneo';

/**
 * Qué está esperando al organizador, derivado del estado del torneo.
 *
 * **Por qué existe.** El Resumen mostraba tres botones fijos —Gestionar
 * equipos, Ver fixture, Cargar resultados— que eran exactamente los
 * mismos tres destinos de las tres filas de contadores de arriba. Tres
 * botones que no dicen nada que la pantalla no dijera ya, y que son los
 * mismos el primer día del torneo y el último. Lo que un panel de
 * control tiene que contestar no es "¿adónde puedo ir?" sino "¿qué me
 * está esperando?".
 *
 * **Vive en su propio módulo y no en la página** porque es la única
 * parte con decisiones: cuatro clases de pendiente, un orden de
 * urgencia entre ellas y un paso siguiente distinto por estado. Dentro
 * de un componente de servidor eso no se puede probar sin montar media
 * aplicación; acá es una función pura con su tabla de casos.
 *
 * **El orden es de urgencia, no de aparición en la pantalla.** Primero
 * lo que tiene a alguien esperando del otro lado o traba la tabla.
 */

export interface Pendiente {
  texto: string;
  href: string;
}

export interface LoQueEspera {
  /** Lo que ya está trabado, en orden de urgencia. Vacío es una respuesta válida. */
  pendientes: Pendiente[];
  /**
   * El paso que destraba el torneo cuando no hay nada pendiente — la
   * transición de estado que corresponde. `null` cuando no hay ninguna:
   * un torneo con las inscripciones abiertas y cupo libre está
   * esperando equipos, y apurarlo no es una acción, es un error.
   */
  siguiente: Pendiente | null;
}

/** Estados de partido que todavía pueden recibir un resultado (igual criterio que la pestaña Resultados). */
const ESPERAN_RESULTADO = new Set(['unscheduled', 'scheduled', 'postponed']);
/** Una solicitud sin resolver tiene a un equipo esperando respuesta. */
const INSCRIPCIONES_SIN_RESOLVER = new Set(['pending', 'waitlisted']);

function plural(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

export function calcularLoQueEspera(
  gestion: GestionTorneoResultado,
  ahora = Date.now(),
): LoQueEspera {
  const base = `/torneo/${gestion.id}/gestionar`;
  const pendientes: Pendiente[] = [];

  // 1. Un resultado objetado no lo destraba nadie más: ni el plazo ni el
  //    equipo rival (`06`, D-60). Y mientras tanto la tabla está mal.
  const objetados = gestion.partidos.filter((p) => p.estadoResultado === 'disputed').length;
  if (objetados > 0) {
    pendientes.push({
      texto: plural(objetados, 'resultado objetado', 'resultados objetados'),
      href: `${base}/resultados`,
    });
  }

  // 2. Del otro lado hay un equipo esperando que le contesten.
  const solicitudes = gestion.inscripciones.filter((i) =>
    INSCRIPCIONES_SIN_RESOLVER.has(i.estado),
  ).length;
  if (solicitudes > 0) {
    pendientes.push({
      texto: plural(solicitudes, 'equipo esperando respuesta', 'equipos esperando respuesta'),
      href: `${base}/equipos`,
    });
  }

  // 3. La fecha ya pasó y el resultado no está: es lo que mantiene
  //    desactualizada la tabla de posiciones.
  const sinCargar = gestion.partidos.filter(
    (p) =>
      ESPERAN_RESULTADO.has(p.estado) &&
      p.fechaHoraProgramada !== null &&
      new Date(p.fechaHoraProgramada).getTime() < ahora,
  ).length;
  if (sinCargar > 0) {
    pendientes.push({
      texto: plural(sinCargar, 'partido jugado sin resultado', 'partidos jugados sin resultado'),
      href: `${base}/resultados`,
    });
  }

  // 4. Un partido sin fecha es un partido que nadie puede ir a jugar.
  const sinProgramar = gestion.partidos.filter(
    (p) => p.fechaHoraProgramada === null && ESPERAN_RESULTADO.has(p.estado),
  ).length;
  if (sinProgramar > 0) {
    pendientes.push({
      texto: plural(sinProgramar, 'partido sin programar', 'partidos sin programar'),
      href: `${base}/fixture`,
    });
  }

  return { pendientes, siguiente: calcularSiguiente(gestion, base) };
}

function calcularSiguiente(gestion: GestionTorneoResultado, base: string): Pendiente | null {
  const aprobados = gestion.inscripciones.filter((i) => i.estado === 'approved').length;
  const estado = `${base}/configuracion/estado`;

  switch (gestion.estado) {
    case 'registration_open':
      // Con cupo libre el torneo está esperando equipos, no al
      // organizador: ofrecer "cerrar inscripciones" ahí sería empujarlo
      // a cerrar un torneo a medio llenar.
      return aprobados >= gestion.cupoEquipos
        ? { texto: 'Cerrar las inscripciones', href: estado }
        : null;
    case 'registration_closed':
      return gestion.partidos.length === 0
        ? { texto: 'Generar el fixture', href: `${base}/fixture` }
        : { texto: 'Iniciar el torneo', href: estado };
    case 'in_progress': {
      const todosResueltos =
        gestion.partidos.length > 0 &&
        gestion.partidos.every((p) => !ESPERAN_RESULTADO.has(p.estado));
      return todosResueltos ? { texto: 'Finalizar el torneo', href: estado } : null;
    }
    case 'suspended':
      return { texto: 'Retomar el torneo', href: estado };
    default:
      // Borrador no pasa por acá (el Resumen sale antes), y un torneo
      // terminado o cancelado ya no se mueve.
      return null;
  }
}
