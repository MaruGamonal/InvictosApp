import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { EstadoVacio } from '@/components/EstadoVacio';
import { obtenerGestionCacheada } from '../_datos';
import { PanelFixture } from '../PanelFixture';
import { PanelProgramarPartidos } from '../PanelProgramarPartidos';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Fixture del torneo') };

const ESTADOS_SIN_FIXTURE_POSIBLE = new Set(['draft', 'registration_open']);

/**
 * UC-29/UC-30 — Generar el fixture de cada fase y programar/reprogramar
 * los partidos.
 *
 * Es la única pestaña **mixta**: generar y confirmar el fixture pide
 * `configurar_torneo`, programar un partido pide `programar_partidos`,
 * que es uno de los tres permisos fijos del Colaborador (`06`, D-32).
 * Así que un colaborador ve esta pantalla, pero sólo la mitad de
 * abajo. Los dos estados vacíos mandan a Configuración, que tampoco es
 * suya: para él dicen lo mismo sin ofrecerle una puerta cerrada.
 */
export default async function PaginaFixture({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestion = await obtenerGestionCacheada(id);
  const organiza = gestion.miRolEnTorneo === 'organizacion';

  const equipoNombres = Object.fromEntries(
    gestion.inscripciones.map((i) => [i.equipoId, i.nombreEquipo]),
  );

  if (gestion.fases.length === 0) {
    return organiza ? (
      <EstadoVacio
        mensaje="Todavía no definiste el formato del torneo — hace falta antes de generar el fixture."
        textoAccion="Definir el formato"
        hrefAccion={`/torneo/${id}/gestionar/configuracion/formato`}
      />
    ) : (
      <EstadoVacio mensaje="El torneo todavía no tiene formato definido: cuando lo tenga, acá vas a poder programar los partidos." />
    );
  }

  if (ESTADOS_SIN_FIXTURE_POSIBLE.has(gestion.estado)) {
    return organiza ? (
      <EstadoVacio
        mensaje="Cerrá las inscripciones antes de generar el fixture — un equipo que entra después obliga a rehacerlo."
        textoAccion="Cerrar las inscripciones"
        hrefAccion={`/torneo/${id}/gestionar/configuracion/estado`}
      />
    ) : (
      <EstadoVacio mensaje="Las inscripciones siguen abiertas: el fixture se genera cuando se cierren." />
    );
  }

  return (
    <div className={styles.pagina}>
      {organiza && (
        <div>
          <span className={styles.tituloSeccion}>Formato</span>
          <PanelFixture fases={gestion.fases} equipoNombres={equipoNombres} />
        </div>
      )}

      {gestion.partidos.length > 0 ? (
        <div>
          <span className={styles.tituloSeccion}>Programar partidos</span>
          <PanelProgramarPartidos partidos={gestion.partidos} ciudadId={gestion.ciudadId} />
        </div>
      ) : (
        !organiza && (
          <EstadoVacio mensaje="Todavía no hay partidos generados: cuando el organizador arme el fixture, los vas a poder programar desde acá." />
        )
      )}
    </div>
  );
}
