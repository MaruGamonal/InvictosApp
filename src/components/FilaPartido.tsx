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
  /** Texto ya formateado ("Sáb 14, 18:00") — el formato de fecha no es de este componente. */
  fechaProgramadaTexto?: string;
}

/**
 * Fila de partido (`08`, 11.10), con sus cuatro variantes según
 * `Partido.estado` (`04`, 4.6): programado, jugado, ganado por
 * presentación y suspendido. El resultado queda siempre centrado entre
 * local y visitante (Design System, sección 07).
 */
export function FilaPartido({
  estado,
  equipoLocal,
  equipoVisitante,
  golesLocal,
  golesVisitante,
  fechaProgramadaTexto,
}: FilaPartidoProps) {
  const hayResultado = estado === 'played' || estado === 'walkover';

  return (
    <div className={styles.fila}>
      <div className={styles.equipo}>
        <Escudo src={equipoLocal.escudoUrl} nombre={equipoLocal.nombre} tamano={32} />
        <span className={styles.nombreEquipo}>{equipoLocal.nombre}</span>
      </div>

      <div className={styles.centro}>
        {hayResultado ? (
          <span className={styles.resultado}>
            {golesLocal} - {golesVisitante}
          </span>
        ) : estado === 'scheduled' && fechaProgramadaTexto ? (
          <span className={styles.fechaProgramada}>{fechaProgramadaTexto}</span>
        ) : (
          <span className={styles.resultado}>vs</span>
        )}
        {estado !== 'unscheduled' && <Badge campo="partido.estado" valor={estado} />}
      </div>

      <div className={`${styles.equipo} ${styles.visitante}`}>
        <Escudo src={equipoVisitante.escudoUrl} nombre={equipoVisitante.nombre} tamano={32} />
        <span className={styles.nombreEquipo}>{equipoVisitante.nombre}</span>
      </div>
    </div>
  );
}
