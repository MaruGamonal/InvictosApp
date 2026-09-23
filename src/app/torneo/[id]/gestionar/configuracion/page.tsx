import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { listarReglamentos } from '@/services/torneos/listarReglamentos';
import { listarColaboradoresTorneo } from '@/services/organizadores/listarColaboradoresTorneo';
import { listarMiembros } from '@/services/organizadores/listarMiembros';
import { obtenerResumenParaPublicar } from '@/services/torneos/obtenerResumenParaPublicar';
import { BotonVerificarOrganizacion } from '@/components/BotonVerificarOrganizacion';
import { obtenerContextoCacheado, obtenerGestionCacheada } from '../_datos';
import { FormularioEditarTorneo } from '../FormularioEditarTorneo';
import { AccionesEstadoTorneo } from '../AccionesEstadoTorneo';
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
export default async function PaginaConfiguracion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contexto = await obtenerContextoCacheado();
  const [gestion, reglamentos, colaboradores, publicacion] = await Promise.all([
    obtenerGestionCacheada(id),
    listarReglamentos({ torneoId: id }, contexto),
    listarColaboradoresTorneo({ torneoId: id }, contexto),
    // Mismo permiso (`configurar_torneo`) y misma pregunta que al
    // publicar: en qué condiciones está este torneo para el descubrimiento.
    obtenerResumenParaPublicar({ torneoId: id }, contexto),
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

      <SeccionAcordeon titulo="Estado">
        <AccionesEstadoTorneo
          torneoId={id}
          estado={gestion.estado}
          tieneFormatoDefinido={gestion.fases.length > 0}
          tienePartidos={gestion.partidos.length > 0}
        />

        {/* D-51: la verificación no bloquea trabajar, condiciona aparecer
            en el descubrimiento. Eso es un estado del torneo que dura
            hasta que alguien lo resuelve, así que vive acá —con la
            salida al lado— y no en un aviso que se va solo. */}
        {!publicacion.organizacionVerificada && (
          <div className={styles.bloqueVisibilidad}>
            <h3 className={stylesCompartidos.tituloSeccion}>Visibilidad en el descubrimiento</h3>
            <p className={styles.textoVisibilidad}>
              {gestion.estado === 'draft'
                ? 'Tu organización no está verificada. Podés publicar igual: el torneo se comparte por link y funciona completo, pero no va a aparecer en las búsquedas.'
                : 'Tu organización no está verificada, así que este torneo no aparece en las búsquedas. Se comparte por link y funciona completo; verificar la organización lo suma al descubrimiento.'}
            </p>
            {publicacion.limitePublicadosAlcanzado && gestion.estado === 'draft' && (
              <p className={styles.textoVisibilidad}>
                Además, sin verificar podés tener un solo torneo publicado a la vez — y ya tenés
                uno, así que este no va a poder publicarse hasta que la verifiques.
              </p>
            )}
            <BotonVerificarOrganizacion
              organizacionId={publicacion.organizacionId}
              soyTitular={publicacion.soyTitular}
              etiqueta="Verificar organización"
              variante="secundaria"
            />
          </div>
        )}

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
