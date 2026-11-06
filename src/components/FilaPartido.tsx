import { Badge } from './Badge';
import { Escudo } from './Escudo';
import styles from './FilaPartido.module.css';

export type EstadoPartido =
  'unscheduled' | 'scheduled' | 'played' | 'walkover' | 'postponed' | 'cancelled';

export interface FilaPartidoProps {
  estado: EstadoPartido;
  equipoLocal: { nombre: string; escudoUrl?: string | null };
  equipoVisitante: { nombre: string; escudoUrl?: string | null };
  golesLocal?: number | null;
  golesVisitante?: number | null;
  /** Texto ya formateado ("Sáb 14, 18:00") — el formato de fecha no es de este componente. Va en la línea de datos. */
  fechaProgramadaTexto?: string;
  /** Jugador del partido, si quien organizó lo eligió al cargar el resultado — solo aplica a partidos jugados. */
  jugadorDelPartido?: { nombreVisible: string } | null;
  /**
   * Dónde se juega. Va en la línea de datos de abajo, con el día y la
   * hora, o "Sin fecha todavía" (`08`, 11.4: "día, hora, sede"). Sin
   * ninguno de esos datos, la fila no tiene esa línea.
   */
  sedeNombre?: string | null;
  /**
   * La fecha que tenía antes de moverse, ya formateada — sólo si se
   * reprogramó (`06`, D-30: se muestra la vigente sin esconder que se
   * movió).
   */
  fechaOriginalTexto?: string;
  /**
   * Si la fila es parte de un fixture: ahí un partido sin fecha tiene
   * que decirlo. Fuera del fixture (p. ej. "próximo partido") no hace
   * falta.
   */
  conLineaDeDatos?: boolean;
}

/**
 * Fila de partido (`08`, 11.10), con sus cuatro variantes según
 * `Partido.estado` (`04`, 4.6): programado, jugado, ganado por
 * presentación y suspendido. El resultado queda siempre centrado entre
 * local y visitante (Design System, sección 07).
 *
 * A 360px no entra una fila horizontal con escudo al costado de cada
 * nombre: con la fecha y el badge en el centro, cada nombre tenía 40 a
 * 70px y salía "Equi…" o "Estudia / ntes", y no se sabía quién jugaba
 * contra quién. Por eso cada equipo es escudo arriba y nombre abajo (en
 * hasta dos líneas), el centro es sólo el resultado o "vs", y estado,
 * día, hora y sede van en la línea de abajo.
 */
export function FilaPartido({
  estado,
  equipoLocal,
  equipoVisitante,
  golesLocal,
  golesVisitante,
  fechaProgramadaTexto,
  jugadorDelPartido,
  sedeNombre,
  fechaOriginalTexto,
  conLineaDeDatos = false,
}: FilaPartidoProps) {
  const hayResultado = estado === 'played' || estado === 'walkover';

  // La línea de datos: lo que el centro no dice. Un partido sin
  // programar mostraba "vs" sin ningún badge, igual que uno programado
  // al que le faltara el texto — y "¿cuándo juego?" quedaba sin
  // respuesta (`05`, principio 4).
  const datos: string[] = [];
  if (conLineaDeDatos && estado === 'unscheduled') datos.push('Sin fecha todavía');
  // La fecha va siempre acá y no en el centro: "sáb, 14 nov, 18:00"
  // ocupaba 120px entre los dos equipos y a 360px dejaba los nombres en
  // 40px ("Equip / o de"). El centro queda para resultado o "vs".
  if (fechaProgramadaTexto && estado !== 'unscheduled') datos.push(fechaProgramadaTexto);
  if (sedeNombre) datos.push(sedeNombre);
  // El badge va abajo, con los datos, y no en el centro: ahí "Programado"
  // ocupaba 100px y los nombres quedaban en 70 ("Estudia / ntes").
  const conBadge = estado !== 'unscheduled';

  return (
    <div className={styles.fila}>
      <div className={styles.equipo}>
        <Escudo src={equipoLocal.escudoUrl} nombre={equipoLocal.nombre} tamano={28} />
        <span className={styles.nombreEquipo}>{equipoLocal.nombre}</span>
      </div>

      <div className={styles.centro}>
        {hayResultado ? (
          <span className={styles.resultado}>
            {golesLocal} - {golesVisitante}
          </span>
        ) : (
          <span className={styles.resultado}>vs</span>
        )}
        {hayResultado && jugadorDelPartido && (
          <span className={styles.jugadorDelPartido}>⭐ {jugadorDelPartido.nombreVisible}</span>
        )}
      </div>

      <div className={styles.equipo}>
        <Escudo src={equipoVisitante.escudoUrl} nombre={equipoVisitante.nombre} tamano={28} />
        <span className={styles.nombreEquipo}>{equipoVisitante.nombre}</span>
      </div>

      {(conBadge || datos.length > 0 || fechaOriginalTexto) && (
        <div className={styles.datos}>
          {conBadge && <Badge campo="partido.estado" valor={estado} />}
          {datos.length > 0 && <span>{datos.join(' · ')}</span>}
          {fechaOriginalTexto && (
            <span className={styles.reprogramado}>Se movió · antes era {fechaOriginalTexto}</span>
          )}
        </div>
      )}
    </div>
  );
}
