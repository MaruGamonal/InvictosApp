import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { obtenerGestionTorneo } from '@/services/torneos/obtenerGestionTorneo';
import { listarReglamentos } from '@/services/torneos/listarReglamentos';
import { listarColaboradoresTorneo } from '@/services/organizadores/listarColaboradoresTorneo';
import { esErrorDeAplicacion } from '@/lib/errores';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { conNombreProducto } from '@/lib/nombreProducto';
import { AccionesEstadoTorneo } from './AccionesEstadoTorneo';
import { FormularioEditarTorneo } from './FormularioEditarTorneo';
import { FormularioDefinirFormato } from './FormularioDefinirFormato';
import { FormularioReglamentoOrganizador } from './FormularioReglamentoOrganizador';
import { PanelInscripciones } from './PanelInscripciones';
import { PanelFixture } from './PanelFixture';
import { PanelResultados } from './PanelResultados';
import { PanelColaboradores } from './PanelColaboradores';
import { PanelCancelarTorneo } from './PanelCancelarTorneo';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Gestionar torneo') };

/**
 * Gestión del torneo (D3-torneo: UC-17, UC-18, UC-20, UC-25, UC-29,
 * UC-31, UC-51) — a diferencia de la ficha pública (cacheada por
 * evento, D-04b), esta pantalla es autenticada y solo para quien
 * administra la organización (Titular/Administrador); un Colaborador
 * asignado tiene sus tres acciones fijas pero no esta pantalla
 * completa (`06`, D-32).
 *
 * Un torneo creado hoy nace `draft` con el `formato` elegido pero sin
 * `fase`/`grupo` — eso recién lo crea `definirFormato` (UC-17), un paso
 * propio que el alta de un solo formulario (`torneo/crear`) todavía no
 * dispara solo. Sin fases, no hay fixture posible: por eso esta
 * pantalla lo pide primero, antes que cualquier otra cosa.
 */
export default async function PaginaGestionarTorneo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  let gestion;
  try {
    gestion = await obtenerGestionTorneo({ torneoId: id }, contexto);
  } catch (error) {
    if (
      esErrorDeAplicacion(error) &&
      (error.codigo === 'SIN_PERMISO' || error.codigo === 'NO_ENCONTRADO')
    ) {
      redirect(`/torneo/${id}`);
    }
    throw error;
  }

  const reglamentos = await listarReglamentos({ torneoId: id }, contexto);
  const reglamentoVigente = reglamentos.find((r) => r.estado === 'current') ?? null;
  const colaboradores = await listarColaboradoresTorneo({ torneoId: id }, contexto);

  const partidosSinJugar = gestion.partidos.filter((p) => p.estado !== 'played');
  const equipoNombres = Object.fromEntries(
    gestion.inscripciones.map((i) => [i.equipoId, i.nombreEquipo]),
  );

  return (
    <div className={styles.pagina}>
      <h1 className={`fuente-display ${styles.titulo}`}>Gestionar {gestion.nombre}</h1>
      <span className={styles.pillEstado}>
        {obtenerEtiqueta('torneo.estado', gestion.estado).etiqueta}
      </span>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Datos del torneo</h2>
        <FormularioEditarTorneo
          torneoId={id}
          nombre={gestion.nombre}
          descripcion={gestion.descripcion}
          direccion={gestion.direccion}
          costoInscripcion={gestion.costoInscripcion}
          costoPlanilla={gestion.costoPlanilla}
          cupoEquipos={gestion.cupoEquipos}
          fechaInicioEstimada={gestion.fechaInicioEstimada}
        />
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Estado</h2>
        <AccionesEstadoTorneo
          torneoId={id}
          estado={gestion.estado}
          tieneFormatoDefinido={gestion.fases.length > 0}
          tienePartidos={gestion.partidos.length > 0}
        />
      </section>

      {gestion.fases.length === 0 ? (
        <section className={styles.seccion}>
          <h2 className={styles.tituloSeccion}>Formato</h2>
          <FormularioDefinirFormato torneoId={id} formatoElegido={gestion.formato} />
        </section>
      ) : (
        <section className={styles.seccion}>
          <h2 className={styles.tituloSeccion}>Formato</h2>
          <div className={styles.lista}>
            {gestion.fases.map((fase) => (
              <div key={fase.id} className={styles.filaPendiente}>
                <span>{fase.nombre}</span>
                <span className={styles.rolIntegrante}>
                  {fase.tipoFase === 'league' ? 'Liga' : 'Eliminación directa'}
                  {fase.cantidadGrupos > 1 ? ` · ${fase.cantidadGrupos} zonas` : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Reglamento</h2>
        <FormularioReglamentoOrganizador torneoId={id} vigente={reglamentoVigente} />
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Inscripciones</h2>
        <PanelInscripciones
          torneoId={id}
          inscripciones={gestion.inscripciones}
          cupoEquipos={gestion.cupoEquipos}
        />
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Colaboradores de este torneo</h2>
        <PanelColaboradores torneoId={id} colaboradores={colaboradores} />
      </section>

      {gestion.estado !== 'draft' &&
        gestion.estado !== 'registration_open' &&
        gestion.fases.length > 0 && (
          <section className={styles.seccion}>
            <h2 className={styles.tituloSeccion}>Fixture</h2>
            <PanelFixture fases={gestion.fases} equipoNombres={equipoNombres} />
          </section>
        )}

      {gestion.estado === 'in_progress' && (
        <section className={styles.seccion}>
          <h2 className={styles.tituloSeccion}>Cargar resultados</h2>
          <PanelResultados partidos={partidosSinJugar} />
        </section>
      )}

      {['registration_open', 'registration_closed', 'in_progress', 'suspended'].includes(
        gestion.estado,
      ) && (
        <section className={styles.seccionPeligro}>
          <h2 className={styles.tituloSeccion}>Interrumpir el torneo</h2>
          <p className={styles.textoPeligro}>
            Cancelar es definitivo — a diferencia de &quot;Suspender&quot;, más arriba, que se
            puede retomar.
          </p>
          <PanelCancelarTorneo torneoId={id} />
        </section>
      )}
    </div>
  );
}
