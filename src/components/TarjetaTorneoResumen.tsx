import Link from 'next/link';
import { Escudo } from './Escudo';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import styles from './TarjetaTorneoResumen.module.css';

export interface TarjetaTorneoResumenProps {
  torneoId: string;
  nombre: string;
  categoriaGenero: string;
  modalidad: string;
  /** Mi equipo en este torneo — solo tiene sentido en el bloque de jugador. */
  miEquipoNombre?: string;
  posicionActual?: number | null;
  /** Estado + inscriptos/cupo — solo tiene sentido en el bloque de organizador. */
  estado?: string;
  inscriptos?: number;
  cupoEquipos?: number;
  /** Texto libre a la derecha (p. ej. "Siguiendo") — se ignora si hay `posicionActual`. */
  etiquetaDerecha?: string;
}

/** Fila de torneo compacta — Inicio ("Mis torneos", "Torneos que sigo", "Mis torneos" del organizador). */
export function TarjetaTorneoResumen({
  torneoId,
  nombre,
  categoriaGenero,
  modalidad,
  miEquipoNombre,
  posicionActual,
  estado,
  inscriptos,
  cupoEquipos,
  etiquetaDerecha,
}: TarjetaTorneoResumenProps) {
  return (
    <Link href={`/torneo/${torneoId}`} className={styles.tarjeta}>
      <Escudo nombre={nombre} tamano={44} />
      <div className={styles.contenido}>
        <span className={styles.nombre}>{nombre}</span>
        <span className={styles.meta}>
          {obtenerEtiqueta('torneo.categoriaGenero', categoriaGenero).etiqueta} ·{' '}
          {obtenerEtiqueta('torneo.modalidad', modalidad).etiqueta}
        </span>
        {miEquipoNombre && <span className={styles.miEquipo}>Jugás con {miEquipoNombre}</span>}
        {estado && (
          <span className={styles.meta}>
            {inscriptos ?? 0} / {cupoEquipos ?? 0} inscriptos
          </span>
        )}
      </div>
      {typeof posicionActual === 'number' ? (
        <div className={styles.posicion}>
          <span className={styles.posicionNumero}>{posicionActual}°</span>
          <span className={styles.posicionEtiqueta}>en la tabla</span>
        </div>
      ) : (
        etiquetaDerecha && <span className={styles.etiquetaDerecha}>{etiquetaDerecha}</span>
      )}
    </Link>
  );
}
