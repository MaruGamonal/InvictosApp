import styles from './Marcador.module.css';

export interface MarcadorProps {
  nombreLocal: string;
  nombreVisitante: string;
  golesLocal: number;
  golesVisitante: number;
  enVivo?: boolean;
}

/**
 * El "momento con energía" del sistema (`08`, 5.1; Design System, sección
 * 06): el número más grande de todo el producto, sobre fondo oscuro de
 * identidad. Es la única pantalla donde el sistema "sube la voz" — el
 * punto en vivo es la única animación de todo el sistema.
 */
export function Marcador({
  nombreLocal,
  nombreVisitante,
  golesLocal,
  golesVisitante,
  enVivo,
}: MarcadorProps) {
  return (
    <div className={styles.marcador}>
      <div className={styles.equipo}>
        <span className={styles.nombreEquipo}>{nombreLocal}</span>
      </div>
      <div className={styles.goles}>{golesLocal}</div>
      <div className={styles.separador}>
        {enVivo ? (
          <span className={styles.enVivo}>
            <span className={styles.puntoEnVivo} aria-hidden="true" />
            En vivo
          </span>
        ) : (
          '-'
        )}
      </div>
      <div className={styles.goles}>{golesVisitante}</div>
      <div className={styles.equipo}>
        <span className={styles.nombreEquipo}>{nombreVisitante}</span>
      </div>
    </div>
  );
}
