/**
 * UC-34 — "Si la suma de goles individuales no coincide con el
 * resultado, el sistema **debería avisar sin bloquear** (puede haber
 * goles en contra o un dato incompleto)."
 *
 * Avisar y no bloquear es la mitad importante. Cargar la planilla es
 * opcional (`06`, D-26) justamente porque en el amateur nadie se
 * acuerda de todos los goles: si el formulario se trabara hasta que
 * cuadre, la salida fácil sería no cargar ningún goleador, y la tabla
 * de goleadores —el segundo contenido más mirado de un torneo— se
 * queda vacía.
 *
 * **El gol en contra suma al otro equipo.** Es la cuenta que se hace
 * mal: un `own_goal` de alguien del local es un gol del visitante. Sin
 * esto, cualquier partido con un gol en contra avisaría de un
 * descuadre que no existe, y un aviso que miente se deja de leer.
 */

export type TipoDeEvento = 'goal' | 'own_goal' | 'yellow_card' | 'red_card';

export interface EventoAtribuido {
  equipoId: string;
  tipoEvento: TipoDeEvento;
}

export interface GolesPorEquipo {
  local: number;
  visitante: number;
}

/** Cuántos goles quedan atribuidos a cada equipo, contando los en contra al revés. */
export function contarGolesAtribuidos(
  eventos: readonly EventoAtribuido[],
  equipoLocalId: string,
  equipoVisitanteId: string,
): GolesPorEquipo {
  let local = 0;
  let visitante = 0;

  for (const evento of eventos) {
    const esDelLocal = evento.equipoId === equipoLocalId;
    const esDelVisitante = evento.equipoId === equipoVisitanteId;
    if (!esDelLocal && !esDelVisitante) continue;

    if (evento.tipoEvento === 'goal') {
      if (esDelLocal) local += 1;
      else visitante += 1;
    } else if (evento.tipoEvento === 'own_goal') {
      // En contra: el gol es del rival.
      if (esDelLocal) visitante += 1;
      else local += 1;
    }
  }

  return { local, visitante };
}

export interface Descuadre {
  /** Lo que dice el marcador. */
  marcador: GolesPorEquipo;
  /** Lo que suman los goles atribuidos. */
  atribuidos: GolesPorEquipo;
}

/**
 * El descuadre entre el marcador y los goles atribuidos, o `null` si no
 * hay nada que avisar.
 *
 * No avisa cuando no hay ningún gol cargado: una planilla con sólo
 * tarjetas no es una planilla incompleta de goles, es una planilla de
 * tarjetas. Avisar ahí sería pedirle al organizador que cargue
 * goleadores cada vez que anota una amarilla.
 */
export function descuadreDeGoles(
  eventos: readonly EventoAtribuido[],
  equipoLocalId: string,
  equipoVisitanteId: string,
  marcador: GolesPorEquipo,
): Descuadre | null {
  const hayAlgunGol = eventos.some(
    (evento) => evento.tipoEvento === 'goal' || evento.tipoEvento === 'own_goal',
  );
  if (!hayAlgunGol) return null;

  const atribuidos = contarGolesAtribuidos(eventos, equipoLocalId, equipoVisitanteId);
  if (atribuidos.local === marcador.local && atribuidos.visitante === marcador.visitante) {
    return null;
  }
  return { marcador, atribuidos };
}

/** El aviso, en una línea, nombrando los dos equipos. */
export function textoDelDescuadre(
  descuadre: Descuadre,
  nombreLocal: string,
  nombreVisitante: string,
): string {
  const lado = (nombre: string, marcador: number, atribuidos: number) =>
    `${nombre}: ${marcador} en el marcador y ${atribuidos} ${atribuidos === 1 ? 'atribuido' : 'atribuidos'}`;

  const lados: string[] = [];
  if (descuadre.atribuidos.local !== descuadre.marcador.local) {
    lados.push(lado(nombreLocal, descuadre.marcador.local, descuadre.atribuidos.local));
  }
  if (descuadre.atribuidos.visitante !== descuadre.marcador.visitante) {
    lados.push(lado(nombreVisitante, descuadre.marcador.visitante, descuadre.atribuidos.visitante));
  }

  return `Los goles cargados no coinciden con el marcador — ${lados.join('; ')}. Podés guardar igual.`;
}
