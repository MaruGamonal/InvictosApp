import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { listarReglamentos } from '@/services/torneos/listarReglamentos';
import { listarColaboradoresTorneo } from '@/services/organizadores/listarColaboradoresTorneo';
import { listarMiembros } from '@/services/organizadores/listarMiembros';
import { obtenerContextoCacheado, obtenerGestionCacheada } from '../_datos';
import { FormularioEditarTorneo } from '../FormularioEditarTorneo';
import { AccionesEstadoTorneo } from '../AccionesEstadoTorneo';
import { ESTADOS_CON_ACCIONES_DE_ESTADO } from '../_estadosDeTorneo';
import { FormularioDefinirFormato } from '../FormularioDefinirFormato';
import { FormularioReglamentoOrganizador } from '../FormularioReglamentoOrganizador';
import { PanelColaboradores } from '../PanelColaboradores';
import { PanelDivisiones } from '../PanelDivisiones';
import { PanelAdministradores } from '../PanelAdministradores';
import { PanelCancelarTorneo } from '../PanelCancelarTorneo';
import { SeccionAcordeon } from '../SeccionAcordeon';
import stylesCompartidos from '../pagina.module.css';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Configuración del torneo') };

/**
 * Todo lo administrativo del torneo, como acordeones (`<details>`, sin
 * JS): son muchas secciones que casi nunca se tocan todas juntas, así
 * que solo "Datos del torneo" arranca abierta — el resto, a un toque.
 * "Interrumpir el torneo" vive adentro de "Estado", no aparte: es la
 * misma pregunta ("¿en qué estado está esto?"), solo que con la
 * respuesta más drástica.
 *
 * Lo que **no** está acá es publicar. Vivía dentro de "Estado", que es
 * el último acordeón de una pantalla larga, y en una versión más pobre
 * que la del alta. Ahora está en el Resumen, que es la primera pestaña
 * y la primera cosa que se ve. Y como en borrador este acordeón se
 * quedaba sin ninguna acción, directamente no se muestra: uno que se
 * abre vacío es peor que no estar — lo mismo para un torneo terminado o
 * cancelado, donde ya pasaba antes de este cambio.
 */
export default async function PaginaConfiguracion({ params }: { params: Promise<{ id: string }> }) {
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
          imagenUrl={gestion.imagenUrl}
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

      <SeccionAcordeon titulo="Divisiones">
        <PanelDivisiones
          torneoId={id}
          certamenId={gestion.certamenId}
          division={gestion.division}
          divisionesDelCertamen={gestion.divisionesDelCertamen}
        />
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

      {ESTADOS_CON_ACCIONES_DE_ESTADO.has(gestion.estado) && (
        <SeccionAcordeon titulo="Estado">
          <AccionesEstadoTorneo
            torneoId={id}
            estado={gestion.estado}
            tienePartidos={gestion.partidos.length > 0}
          />

          <div className={stylesCompartidos.seccionPeligro}>
            <h3 className={stylesCompartidos.tituloSeccion}>Interrumpir el torneo</h3>
            <PanelCancelarTorneo torneoId={id} />
          </div>
        </SeccionAcordeon>
      )}
    </div>
  );
}
