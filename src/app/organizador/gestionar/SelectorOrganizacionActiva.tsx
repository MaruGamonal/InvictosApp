import { Escudo } from '@/components/Escudo';
import { HojaDeOpciones } from '@/components/HojaDeOpciones';
import { claseDeOpcion, CuerpoDeOpcion } from '@/components/_opcionesDeHoja';
import type { OrganizacionListada } from '@/services/organizadores/listarMisOrganizaciones';
import { elegirOrganizacionActiva } from './_acciones';
import styles from './SelectorOrganizacionActiva.module.css';

export interface SelectorOrganizacionActivaProps {
  /** Siempre más de una: con una sola la pantalla muestra `EtiquetaOrganizacion`. */
  organizaciones: OrganizacionListada[];
  activaId: string;
  nombreActiva: string;
  logoActiva: string | null;
}

/**
 * Cuál organización se está gestionando, en la misma fila que el modo
 * y con la misma hoja de selección.
 *
 * Era un desplegable en letra chica al lado del nombre de la persona,
 * compartiendo renglón con el saludo. Dos problemas: el blanco táctil
 * era del tamaño del texto, y el control más importante de la pantalla
 * —en qué organización estoy trabajando— se leía como un rótulo.
 *
 * Ahora comparte la fila de 44px con el selector de modo: los dos son
 * "dónde estoy parada", así que se leen como un par. **Solo aparece
 * con más de una organización**; con una sola la fila es del modo solo
 * y la organización queda como etiqueta al lado del nombre.
 *
 * Cada opción sigue siendo el `submit` de una Server Action, así que
 * cambiar de organización funciona sin JavaScript.
 */
export function SelectorOrganizacionActiva({
  organizaciones,
  activaId,
  nombreActiva,
  logoActiva,
}: SelectorOrganizacionActivaProps) {
  return (
    <HojaDeOpciones
      etiqueta={nombreActiva}
      icono={<Escudo src={logoActiva} nombre={nombreActiva} tamano={20} />}
      descripcionDelControl="Organización que estás gestionando"
      titulo="Elegí qué organización gestionar"
      bajada="Los torneos, el equipo de trabajo y el perfil son los de la organización que elijas."
    >
      <form className={styles.opciones}>
        {organizaciones.map((organizacion) => {
          const esActiva = organizacion.organizacionId === activaId;
          const cuerpo = (
            <CuerpoDeOpcion
              titulo={organizacion.nombre}
              detalle={esActiva ? 'La que estás gestionando ahora.' : undefined}
              elegida={esActiva}
            />
          );

          if (esActiva) {
            return (
              <span
                key={organizacion.organizacionId}
                className={claseDeOpcion(true)}
                aria-current="true"
              >
                <Escudo src={organizacion.logoUrl} nombre={organizacion.nombre} tamano={28} />
                {cuerpo}
              </span>
            );
          }

          return (
            <button
              key={organizacion.organizacionId}
              type="submit"
              formAction={elegirOrganizacionActiva.bind(null, organizacion.organizacionId)}
              className={claseDeOpcion(false)}
            >
              <Escudo src={organizacion.logoUrl} nombre={organizacion.nombre} tamano={28} />
              {cuerpo}
            </button>
          );
        })}
      </form>
    </HojaDeOpciones>
  );
}
