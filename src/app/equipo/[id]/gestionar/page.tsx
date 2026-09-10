import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { obtenerMiPerfil } from '@/services/identidad/obtenerMiPerfil';
import { obtenerEquipoPublico } from '@/services/equipos/obtenerEquipoPublico';
import { obtenerGestionEquipo } from '@/services/equipos/obtenerGestionEquipo';
import { obtenerRolesEnEquipo } from '@/lib/permisos';
import { listarCiudadesCacheado } from '@/app/torneos/_datos';
import { esErrorDeAplicacion } from '@/lib/errores';
import { conNombreProducto } from '@/lib/nombreProducto';
import { FilaIntegranteGestion } from './FilaIntegranteGestion';
import { PanelPendientes } from './PanelPendientes';
import { FormularioInvitarIntegrante } from './FormularioInvitarIntegrante';
import { FormularioEditarEquipo } from './FormularioEditarEquipo';
import { BotonArchivarEquipo } from './BotonArchivarEquipo';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Gestionar equipo') };

/**
 * Gestión del plantel (D3: UC-11 a UC-15, UC-53) — a diferencia de la
 * ficha pública del equipo (cacheada por evento, D-04b, igual para
 * cualquier visitante), esta pantalla sí puede leer quién la mira: es
 * autenticada, no pública. Por eso el "Dejar equipo" y las acciones de
 * Capitán/Delegado se resuelven acá y no en `/equipo/[id]`.
 */
export default async function PaginaGestionarEquipo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  const perfil = await obtenerMiPerfil(undefined, contexto);
  const roles = await obtenerRolesEnEquipo(perfil.id, id);
  if (roles.length === 0) redirect(`/equipo/${id}`);

  const esCapitan = roles.includes('captain');
  const puedeGestionar = esCapitan || roles.includes('delegate');

  let equipo;
  try {
    equipo = await obtenerEquipoPublico({ equipoId: id }, contexto);
  } catch (error) {
    if (esErrorDeAplicacion(error) && error.codigo === 'NO_ENCONTRADO') notFound();
    throw error;
  }

  const [gestion, provincias] = puedeGestionar
    ? await Promise.all([
        obtenerGestionEquipo({ equipoId: id }, contexto),
        listarCiudadesCacheado(),
      ])
    : [null, []];

  return (
    <div className={styles.pagina}>
      <h1 className={`fuente-display ${styles.titulo}`}>Gestionar {equipo.nombre}</h1>

      {puedeGestionar && (
        <section className={styles.seccion}>
          <h2 className={styles.tituloSeccion}>Datos del equipo</h2>
          <FormularioEditarEquipo
            equipoId={id}
            nombre={equipo.nombre}
            categoriaGenero={equipo.categoriaGenero}
            modalidadHabitual={equipo.modalidadHabitual}
            ciudadId={equipo.ciudad?.id ?? ''}
            escudoUrl={equipo.escudoUrl}
            provincias={provincias}
          />
        </section>
      )}

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Plantel</h2>
        <div className={styles.lista}>
          {equipo.plantel.map((integrante) => (
            <FilaIntegranteGestion
              key={integrante.perfilId}
              equipoId={id}
              perfilId={integrante.perfilId}
              nombreVisible={integrante.nombreVisible}
              rolesEquipo={integrante.rolesEquipo}
              esUnoMismo={integrante.perfilId === perfil.id}
              esCapitanViewer={esCapitan}
            />
          ))}
        </div>
      </section>

      {puedeGestionar && gestion && (
        <>
          <PanelPendientes
            equipoId={id}
            invitacionesPendientes={gestion.invitacionesPendientes}
            solicitudesPendientes={gestion.solicitudesPendientes}
          />

          <section className={styles.seccion}>
            <h2 className={styles.tituloSeccion}>Invitar integrante</h2>
            <FormularioInvitarIntegrante equipoId={id} />
          </section>
        </>
      )}

      {esCapitan && (
        <section className={styles.seccionPeligro}>
          <h2 className={styles.tituloSeccion}>Archivar equipo</h2>
          <p className={styles.textoPeligro}>
            Baja lógica — no se puede deshacer desde acá. Bloqueado mientras el equipo compite en un
            torneo en curso.
          </p>
          <BotonArchivarEquipo equipoId={id} />
        </section>
      )}
    </div>
  );
}
