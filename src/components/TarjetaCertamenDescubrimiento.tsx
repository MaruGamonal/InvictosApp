import Link from 'next/link';
import { Badge } from './Badge';
import { Escudo } from './Escudo';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import styles from './TarjetaTorneoDescubrimiento.module.css';
import estiloBloque from './TarjetaCertamenDescubrimiento.module.css';

export interface DivisionDelCertamenDescubrimiento {
  torneoId: string;
  division: string;
  estado: string;
  cupoEquipos: number;
  inscriptosAprobados: number;
}

export interface TarjetaCertamenDescubrimientoProps {
  certamenNombre: string;
  imagenUrl?: string | null;
  ciudad: string;
  modalidad: string;
  categoriaGenero: string;
  categoriaEdad: string;
  fechaInicioEstimada: string | null;
  organizacionNombre: string;
  organizacionVerificada: boolean;
  divisiones: DivisionDelCertamenDescubrimiento[];
}

function formatearFecha(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}

/**
 * Bloque de descubrimiento para un certamen (`06`, D-107, `08` 11.3):
 * una tarjeta encabezada por el nombre del certamen —lo compartido
 * (ciudad, fecha, organización) va una sola vez, arriba— y una fila por
 * división con lo que cambia entre ellas: etiqueta, cupo y estado.
 *
 * Recibe las divisiones que `_agruparCertamenes.ts` ya juntó como
 * contiguas dentro de la página actual — puede ser una sola si el corte
 * de página partió el bloque (limitación aceptada, D-107); esta misma
 * tarjeta repite el encabezado en ese caso, que es justamente el punto.
 */
export function TarjetaCertamenDescubrimiento({
  certamenNombre,
  imagenUrl,
  ciudad,
  modalidad,
  categoriaGenero,
  categoriaEdad,
  fechaInicioEstimada,
  organizacionNombre,
  organizacionVerificada,
  divisiones,
}: TarjetaCertamenDescubrimientoProps) {
  const fecha = formatearFecha(fechaInicioEstimada);

  return (
    <article className={styles.tarjeta}>
      <div className={styles.filaTitulo}>
        <h3 className={`fuente-display ${styles.nombre}`}>{certamenNombre}</h3>
      </div>

      <div className={styles.meta}>
        {obtenerEtiqueta('torneo.modalidad', modalidad).etiqueta} ·{' '}
        {obtenerEtiqueta('torneo.categoriaGenero', categoriaGenero).etiqueta}{' '}
        {obtenerEtiqueta('torneo.categoriaEdad', categoriaEdad).etiqueta} · {ciudad}
        {fecha ? ` · Arranca ${fecha}` : ''}
      </div>

      <div className={estiloBloque.divisiones}>
        {divisiones.map((division) => (
          <Link
            key={division.torneoId}
            href={`/torneo/${division.torneoId}`}
            className={estiloBloque.filaDivision}
          >
            <span className={estiloBloque.etiquetaDivision}>División {division.division}</span>
            <Badge campo="torneo.estado" valor={division.estado} />
            <span className={estiloBloque.cupoDivision}>
              {division.inscriptosAprobados}
              <span className={styles.cupoTotal}> / {division.cupoEquipos}</span>
            </span>
          </Link>
        ))}
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
