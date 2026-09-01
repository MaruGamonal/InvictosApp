import { Badge } from './Badge';
import { Escudo } from './Escudo';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import styles from './TarjetaTorneo.module.css';

export interface TarjetaTorneoProps {
  nombre: string;
  imagenUrl?: string | null;
  ciudad: string;
  modalidad: string;
  estado: string;
}

/**
 * Tarjeta de torneo (`08`, 11.10), la unidad del descubrimiento (UC-22).
 * Muestra la ciudad — nunca la dirección, que es de la ficha (`06`,
 * D-25b) — y el estado como badge, nunca como texto suelto.
 */
export function TarjetaTorneo({
  nombre,
  imagenUrl,
  ciudad,
  modalidad,
  estado,
}: TarjetaTorneoProps) {
  return (
    <article className={styles.tarjeta}>
      <Escudo src={imagenUrl} nombre={nombre} tamano={48} />
      <div className={styles.contenido}>
        <span className={styles.nombre}>{nombre}</span>
        <span className={styles.meta}>
          <span>{ciudad}</span>
          <span className={styles.punto}>
            {obtenerEtiqueta('torneo.modalidad', modalidad).etiqueta}
          </span>
        </span>
        <Badge campo="torneo.estado" valor={estado} />
      </div>
    </article>
  );
}
