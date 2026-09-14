import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { EstadoVacio } from '@/components/EstadoVacio';
import { obtenerGestionCacheada } from '../_datos';
import { PanelFixture } from '../PanelFixture';
import { PanelProgramarPartidos } from '../PanelProgramarPartidos';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Fixture del torneo') };

const ESTADOS_SIN_FIXTURE_POSIBLE = new Set(['draft', 'registration_open']);

/** UC-29/UC-30 — Generar el fixture de cada fase y programar/reprogramar los partidos. */
export default async function PaginaFixture({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestion = await obtenerGestionCacheada(id);

  const equipoNombres = Object.fromEntries(
    gestion.inscripciones.map((i) => [i.equipoId, i.nombreEquipo]),
  );

  if (gestion.fases.length === 0) {
    return (
      <EstadoVacio
        mensaje="Todavía no definiste el formato del torneo — hace falta antes de generar el fixture."
        textoAccion="Ir a Configuración"
        hrefAccion={`/torneo/${id}/gestionar/configuracion`}
      />
    );
  }

  if (ESTADOS_SIN_FIXTURE_POSIBLE.has(gestion.estado)) {
    return (
      <EstadoVacio
        mensaje="Cerrá las inscripciones antes de generar el fixture — un equipo que entra después obliga a rehacerlo."
        textoAccion="Ir a Configuración"
        hrefAccion={`/torneo/${id}/gestionar/configuracion`}
      />
    );
  }

  return (
    <div className={styles.pagina}>
      <div>
        <span className={styles.tituloSeccion}>Formato</span>
        <PanelFixture fases={gestion.fases} equipoNombres={equipoNombres} />
      </div>

      {gestion.partidos.length > 0 && (
        <div>
          <span className={styles.tituloSeccion}>Programar partidos</span>
          <PanelProgramarPartidos partidos={gestion.partidos} ciudadId={gestion.ciudadId} />
        </div>
      )}
    </div>
  );
}
