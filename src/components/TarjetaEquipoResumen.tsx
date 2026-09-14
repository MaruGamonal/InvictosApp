import Link from 'next/link';
import { Escudo } from './Escudo';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import styles from './TarjetaEquipoResumen.module.css';

export interface TarjetaEquipoResumenProps {
  id: string;
  nombre: string;
  categoriaGenero: string;
  escudoUrl?: string | null;
  /** Ciudad o texto libre debajo del nombre, junto a la categoría. Sin valor, no muestra nada. */
  detalle?: string | null;
  /** Texto libre a la derecha (rol en el equipo, o "Siguiendo"). Sin valor, no muestra nada. */
  etiquetaDerecha?: string;
  /** Flecha decorativa a la derecha — listados de exploración (buscador de equipos). */
  mostrarFlecha?: boolean;
}

/** Fila de equipo compacta — Inicio ("Mis equipos", "Equipos que sigo") y el buscador de equipos. */
export function TarjetaEquipoResumen({
  id,
  nombre,
  categoriaGenero,
  escudoUrl,
  detalle,
  etiquetaDerecha,
  mostrarFlecha,
}: TarjetaEquipoResumenProps) {
  return (
    <Link href={`/equipo/${id}`} className={styles.tarjeta}>
      <Escudo src={escudoUrl} nombre={nombre} tamano={44} />
      <div className={styles.contenido}>
        <span className={styles.nombre}>{nombre}</span>
        <span className={styles.categoria}>
          {obtenerEtiqueta('torneo.categoriaGenero', categoriaGenero).etiqueta}
          {detalle && ` · ${detalle}`}
        </span>
      </div>
      {etiquetaDerecha && <span className={styles.etiquetaDerecha}>{etiquetaDerecha}</span>}
      {mostrarFlecha && (
        <svg
          className={styles.flecha}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      )}
    </Link>
  );
}
