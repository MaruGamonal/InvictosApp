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
}

/** Fila de equipo compacta — Inicio ("Mis equipos", "Equipos que sigo") y el buscador de equipos. */
export function TarjetaEquipoResumen({
  id,
  nombre,
  categoriaGenero,
  escudoUrl,
  detalle,
  etiquetaDerecha,
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
    </Link>
  );
}
