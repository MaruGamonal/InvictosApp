import { Badge } from './Badge';
import { Escudo } from './Escudo';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import styles from './TarjetaTorneoDescubrimiento.module.css';

export interface TarjetaTorneoDescubrimientoProps {
  nombre: string;
  imagenUrl?: string | null;
  ciudad: string;
  modalidad: string;
  categoriaGenero: string;
  categoriaEdad: string;
  estado: string;
  fechaInicioEstimada: string | null;
  cupoEquipos: number;
  inscriptosAprobados: number;
  organizacionNombre: string;
  organizacionVerificada: boolean;
}

function formatearFecha(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}

/**
 * Tarjeta de torneo para el descubrimiento (UC-22, mockup "Descubrir
 * visitante"): más densa que `TarjetaTorneo` (usada en Inicio y en el
 * catálogo) porque acá es la única información antes de entrar a la
 * ficha — cupo, fecha y organización verificada ayudan a decidir sin
 * un click de más.
 */
export function TarjetaTorneoDescubrimiento({
  nombre,
  imagenUrl,
  ciudad,
  modalidad,
  categoriaGenero,
  categoriaEdad,
  estado,
  fechaInicioEstimada,
  cupoEquipos,
  inscriptosAprobados,
  organizacionNombre,
  organizacionVerificada,
}: TarjetaTorneoDescubrimientoProps) {
  const fecha = formatearFecha(fechaInicioEstimada);

  return (
    <article className={styles.tarjeta}>
      <div className={styles.filaTitulo}>
        <h3 className={`fuente-display ${styles.nombre}`}>{nombre}</h3>
        <Badge campo="torneo.estado" valor={estado} />
      </div>

      <div className={styles.meta}>
        {obtenerEtiqueta('torneo.modalidad', modalidad).etiqueta} ·{' '}
        {obtenerEtiqueta('torneo.categoriaGenero', categoriaGenero).etiqueta}{' '}
        {obtenerEtiqueta('torneo.categoriaEdad', categoriaEdad).etiqueta} · {ciudad}
      </div>

      <div className={styles.filaDatos}>
        <div className={styles.dato}>
          <span className={styles.etiquetaDato}>Arranca</span>
          <span className={styles.valorDato}>{fecha ?? 'A confirmar'}</span>
        </div>
        <div className={`${styles.dato} ${styles.datoDerecha}`}>
          <span className={styles.etiquetaDato}>Cupo</span>
          <span className={`fuente-display ${styles.cupo}`}>
            {inscriptosAprobados}
            <span className={styles.cupoTotal}> / {cupoEquipos}</span>
          </span>
        </div>
      </div>

      <div className={styles.filaOrganizacion}>
        <Escudo src={imagenUrl} nombre={organizacionNombre} tamano={26} />
        <span className={styles.nombreOrganizacion}>{organizacionNombre}</span>
        {organizacionVerificada && (
          <span className={styles.badgeVerificada}>
            <span className={styles.puntoVerificada} aria-hidden />
            Verificada
          </span>
        )}
      </div>
    </article>
  );
}
