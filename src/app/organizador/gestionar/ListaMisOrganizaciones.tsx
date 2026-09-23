import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { Escudo } from '@/components/Escudo';
import type { OrganizacionListada } from '@/services/organizadores/listarMisOrganizaciones';
import { elegirOrganizacionActiva } from './_acciones';
import styles from './ListaMisOrganizaciones.module.css';

export interface ListaMisOrganizacionesProps {
  organizaciones: OrganizacionListada[];
  organizacionActivaId: string | null;
}

/**
 * Las otras organizaciones que administra quien mira.
 *
 * La tarjeta era una sola fila horizontal —escudo, nombre, badge,
 * cantidad, "Verificar", "Gestionar"— y en un teléfono de 360px los dos
 * botones y el texto se pisaban. Ahora la fila tiene **dos renglones**:
 * arriba la identidad (escudo, nombre, estado, cantidad), abajo la
 * acción. Nada compite por el mismo ancho.
 *
 * Y hay **una sola acción principal por tarjeta**: "Gestionar". La
 * verificación se pide desde el detalle de la organización, no desde
 * esta lista: acá eran dos botones del mismo tamaño peleándose la
 * atención para dos cosas que no están al mismo nivel.
 *
 * Cada acción es el `submit` de un formulario con una Server Action:
 * sin JavaScript se cambia de organización igual.
 */
export function ListaMisOrganizaciones({
  organizaciones,
  organizacionActivaId,
}: ListaMisOrganizacionesProps) {
  return (
    <section className={styles.seccion}>
      <h2 className={styles.titulo}>Mis organizaciones</h2>

      <form className={styles.lista}>
        {organizaciones.map((organizacion) => {
          const esActiva = organizacion.organizacionId === organizacionActivaId;
          return (
            <div
              key={organizacion.organizacionId}
              className={esActiva ? `${styles.fila} ${styles.filaActiva}` : styles.fila}
            >
              <div className={styles.identidad}>
                <Escudo src={organizacion.logoUrl} nombre={organizacion.nombre} tamano={40} />
                <div className={styles.datos}>
                  <span className={styles.nombre}>{organizacion.nombre}</span>
                  <div className={styles.meta}>
                    <Badge
                      campo="organizacion.nivelVerificacion"
                      valor={organizacion.nivelVerificacion}
                      conPunto
                    />
                    <span className={styles.cantidad}>
                      {organizacion.cantidadTorneos}{' '}
                      {organizacion.cantidadTorneos === 1 ? 'torneo' : 'torneos'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Una sola acción, en su propio renglón: nunca dos
                  botones compitiendo por el ancho de un teléfono. */}
              {esActiva ? (
                <span className={styles.gestionando}>Gestionando ahora</span>
              ) : (
                <button
                  type="submit"
                  formAction={elegirOrganizacionActiva.bind(null, organizacion.organizacionId)}
                  className={styles.botonGestionar}
                >
                  Gestionar
                </button>
              )}
            </div>
          );
        })}
      </form>

      {/* Acción secundaria: crear otra organización no es lo que se
          viene a hacer a esta pantalla. */}
      <Link href="/organizador/gestionar/crear" className={styles.enlaceCrear}>
        + Crear organización
      </Link>
    </section>
  );
}
