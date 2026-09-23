import { Escudo } from '@/components/Escudo';
import type { OrganizacionListada } from '@/services/organizadores/listarMisOrganizaciones';
import { elegirOrganizacionActiva } from './_acciones';
import styles from './SelectorOrganizacionActiva.module.css';

export interface SelectorOrganizacionActivaProps {
  organizaciones: OrganizacionListada[];
  activaId: string;
  nombreActiva: string;
  logoActiva: string | null;
}

/**
 * Cuál organización se está gestionando, en la cabecera y no en el
 * título.
 *
 * El título dice el modo ("Organizador"); esto dice la entidad. Antes
 * el nombre de la organización ocupaba el lugar del título y no se
 * distinguía de un rótulo: no quedaba claro que fuera **la
 * organización activa** ni que hubiera otra a la que cambiar.
 *
 * Con una sola organización es una etiqueta, sin flecha ni despliegue:
 * ofrecer elegir entre una cosa es prometer una opción que no existe.
 * Con varias es un `<details>`, así que cambia de organización sin
 * JavaScript — cada opción es el `submit` de una Server Action.
 */
export function SelectorOrganizacionActiva({
  organizaciones,
  activaId,
  nombreActiva,
  logoActiva,
}: SelectorOrganizacionActivaProps) {
  if (organizaciones.length <= 1) {
    return (
      <p className={styles.unica}>
        <Escudo src={logoActiva} nombre={nombreActiva} tamano={20} />
        <span className={styles.nombre}>{nombreActiva}</span>
      </p>
    );
  }

  return (
    <details className={styles.selector}>
      <summary className={styles.disparador}>
        <Escudo src={logoActiva} nombre={nombreActiva} tamano={20} />
        <span className={styles.nombre}>{nombreActiva}</span>
        <svg className={styles.flecha} viewBox="0 0 16 16" aria-hidden focusable="false">
          <path
            d="m4 6 4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={styles.leyenda}>Cambiar de organización</span>
      </summary>

      <form className={styles.opciones}>
        {organizaciones.map((organizacion) => {
          const esActiva = organizacion.organizacionId === activaId;
          return (
            <button
              key={organizacion.organizacionId}
              type="submit"
              formAction={elegirOrganizacionActiva.bind(null, organizacion.organizacionId)}
              className={esActiva ? styles.opcionActiva : styles.opcion}
              aria-current={esActiva ? 'true' : undefined}
              disabled={esActiva}
            >
              <Escudo src={organizacion.logoUrl} nombre={organizacion.nombre} tamano={24} />
              <span className={styles.opcionNombre}>{organizacion.nombre}</span>
              {esActiva && <span className={styles.opcionMarca}>Gestionando</span>}
            </button>
          );
        })}
      </form>
    </details>
  );
}
