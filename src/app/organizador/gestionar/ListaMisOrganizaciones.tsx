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
 * Las organizaciones que administra quien mira, y cuál está gestionando.
 *
 * `miembro_organizacion` admite varias desde el esquema inicial, pero el
 * panel mostraba una sola —la primera— y no había forma de llegar a las
 * otras. Acá se ven todas, con su estado de verificación y cuántos
 * torneos sostienen, y "Gestionar" cambia cuál está activa.
 *
 * Cada fila es el `submit` de un formulario con una Server Action: sin
 * JavaScript se cambia de organización igual.
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

              {esActiva ? (
                <span className={styles.gestionando}>Gestionando</span>
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

      <Link href="/organizador/gestionar/crear" className={styles.enlaceCrear}>
        + Crear organización
      </Link>
    </section>
  );
}
