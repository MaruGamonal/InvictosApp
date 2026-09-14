import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { listarReglamentos } from '@/services/torneos/listarReglamentos';
import { listarColaboradoresTorneo } from '@/services/organizadores/listarColaboradoresTorneo';
import { listarMiembros } from '@/services/organizadores/listarMiembros';
import { obtenerContextoCacheado, obtenerGestionCacheada } from '../_datos';
import { FormularioEditarTorneo } from '../FormularioEditarTorneo';
import { AccionesEstadoTorneo } from '../AccionesEstadoTorneo';
import { FormularioDefinirFormato } from '../FormularioDefinirFormato';
import { FormularioReglamentoOrganizador } from '../FormularioReglamentoOrganizador';
import { PanelColaboradores } from '../PanelColaboradores';
import { PanelAdministradores } from '../PanelAdministradores';
import { PanelCancelarTorneo } from '../PanelCancelarTorneo';
import stylesCompartidos from '../pagina.module.css';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Configuración del torneo') };

const ESTADOS_CON_CANCELAR = new Set([
  'registration_open',
  'registration_closed',
  'in_progress',
  'suspended',
]);

/**
 * Datos del torneo, formato, reglamento, colaboradores, estado y —
 * separada visualmente al final — la zona destructiva (cancelar).
 */
export default async function PaginaConfiguracion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contexto = await obtenerContextoCacheado();
  const [gestion, reglamentos, colaboradores] = await Promise.all([
    obtenerGestionCacheada(id),
    listarReglamentos({ torneoId: id }, contexto),
    listarColaboradoresTorneo({ torneoId: id }, contexto),
  ]);
  const administradores = await listarMiembros(
    { organizacionId: gestion.organizacionId },
    contexto,
  );
  const reglamentoVigente = reglamentos.find((r) => r.estado === 'current') ?? null;

  return (
    <div className={styles.pagina}>
      <section className={stylesCompartidos.seccion}>
        <h2 className={stylesCompartidos.tituloSeccion}>Datos del torneo</h2>
        <FormularioEditarTorneo
          torneoId={id}
          nombre={gestion.nombre}
          descripcion={gestion.descripcion}
          direccion={gestion.direccion}
          costoInscripcion={gestion.costoInscripcion}
          costoPlanilla={gestion.costoPlanilla}
          cupoEquipos={gestion.cupoEquipos}
          fechaInicioEstimada={gestion.fechaInicioEstimada}
          fechaFinEstimada={gestion.fechaFinEstimada}
        />
      </section>

      <section className={stylesCompartidos.seccion}>
        <h2 className={stylesCompartidos.tituloSeccion}>Estado</h2>
        <AccionesEstadoTorneo
          torneoId={id}
          estado={gestion.estado}
          tieneFormatoDefinido={gestion.fases.length > 0}
          tienePartidos={gestion.partidos.length > 0}
        />
      </section>

      {gestion.fases.length === 0 ? (
        <section className={stylesCompartidos.seccion}>
          <h2 className={stylesCompartidos.tituloSeccion}>Formato</h2>
          <FormularioDefinirFormato torneoId={id} formatoElegido={gestion.formato} />
        </section>
      ) : (
        <section className={stylesCompartidos.seccion}>
          <h2 className={stylesCompartidos.tituloSeccion}>Formato</h2>
          <div className={stylesCompartidos.lista}>
            {gestion.fases.map((fase) => (
              <div key={fase.id} className={stylesCompartidos.filaPendiente}>
                <span>{fase.nombre}</span>
                <span className={stylesCompartidos.rolIntegrante}>
                  {fase.tipoFase === 'league' ? 'Liga' : 'Eliminación directa'}
                  {fase.cantidadGrupos > 1 ? ` · ${fase.cantidadGrupos} zonas` : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={stylesCompartidos.seccion}>
        <h2 className={stylesCompartidos.tituloSeccion}>Reglamento</h2>
        <FormularioReglamentoOrganizador torneoId={id} vigente={reglamentoVigente} />
      </section>

      <section className={stylesCompartidos.seccion}>
        <h2 className={stylesCompartidos.tituloSeccion}>Colaboradores de este torneo</h2>
        <PanelColaboradores torneoId={id} colaboradores={colaboradores} />
      </section>

      <section className={stylesCompartidos.seccion}>
        <h2 className={stylesCompartidos.tituloSeccion}>Equipo de trabajo de la organización</h2>
        <PanelAdministradores
          organizacionId={gestion.organizacionId}
          administradores={administradores}
          esTitular={gestion.miRolEnOrganizacion === 'owner'}
        />
      </section>

      {ESTADOS_CON_CANCELAR.has(gestion.estado) && (
        <section className={stylesCompartidos.seccionPeligro}>
          <h2 className={stylesCompartidos.tituloSeccion}>Interrumpir el torneo</h2>
          <p className={stylesCompartidos.textoPeligro}>
            Cancelar es definitivo — a diferencia de &quot;Suspender&quot;, más arriba, que se
            puede retomar.
          </p>
          <PanelCancelarTorneo torneoId={id} />
        </section>
      )}
    </div>
  );
}
