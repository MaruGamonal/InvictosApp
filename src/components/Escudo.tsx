import styles from './Escudo.module.css';

export interface EscudoProps {
  /** URL de la imagen. Si falta, se muestra un placeholder digno — nunca un espacio roto. */
  src?: string | null;
  /** Nombre del equipo/torneo/persona, para el placeholder (inicial) y el alt. */
  nombre: string;
  tamano?: number;
}

/**
 * Escudo o avatar con placeholder (`08`, 11.10): un equipo sin escudo
 * cargado nunca muestra un ícono roto — muestra su inicial sobre un
 * fondo neutro oscuro, consistente en todos los listados.
 */
export function Escudo({ src, nombre, tamano = 40 }: EscudoProps) {
  const estilo = { width: tamano, height: tamano, fontSize: tamano * 0.42 };

  if (src) {
    return (
      <span className={styles.escudo} style={estilo}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={nombre} className={styles.imagen} />
      </span>
    );
  }

  return (
    <span className={styles.escudo} style={estilo} aria-label={nombre} role="img">
      {nombre.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
