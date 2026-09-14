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
import { SeccionAcordeon } from '../SeccionAcordeon';
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
 * Todo lo administrativo del torneo, como acordeones (`<details>`, sin
 * JS): son muchas secciones que casi nunca se tocan todas juntas, así
 * que solo "Datos del torneo" arranca abierta — el resto, a un toque.
 * "Interrumpir el torneo" vive adentro de "Estado", no aparte: es la
 * misma pregunta ("¿en qué estado está esto?"), solo que con la
 * respuesta más drástica.
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
      <SeccionAcordeon titulo="Datos del torneo" abiertoPorDefecto>
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
      </SeccionAcordeon>

      <SeccionAcordeon titulo="Formato">
        {gestion.fases.length === 0 ? (
          <FormularioDefinirFormato torneoId={id} formatoElegido={gestion.formato} />
        ) : (
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
        )}
      </SeccionAcordeon>

      <SeccionAcordeon titulo="Reglamento">
        <FormularioReglamentoOrganizador torneoId={id} vigente={reglamentoVigente} />
      </SeccionAcordeon>

      <SeccionAcordeon titulo="Colaboradores de este torneo">
        <PanelColaboradores torneoId={id} colaboradores={colaboradores} />
      </SeccionAcordeon>

      <SeccionAcordeon titulo="Equipo de trabajo de la organización">
        <PanelAdministradores
          organizacionId={gestion.organizacionId}
          administradores={administradores}
          esTitular={gestion.miRolEnOrganizacion === 'owner'}
        />
      </SeccionAcordeon>

      <SeccionAcordeon titulo="Estado">
        <AccionesEstadoTorneo
          torneoId={id}
          estado={gestion.estado}
          tieneFormatoDefinido={gestion.fases.length > 0}
          tienePartidos={gestion.partidos.length > 0}
        />

        {ESTADOS_CON_CANCELAR.has(gestion.estado) && (
          <div className={stylesCompartidos.seccionPeligro}>
            <h3 className={stylesCompartidos.tituloSeccion}>Interrumpir el torneo</h3>
            <p className={stylesCompartidos.textoPeligro}>
              Cancelar es definitivo — a diferencia de &quot;Suspender&quot;, más arriba, que se
              puede retomar.
            </p>
            <PanelCancelarTorneo torneoId={id} />
          </div>
        )}
      </SeccionAcordeon>
    </div>
  );
}
