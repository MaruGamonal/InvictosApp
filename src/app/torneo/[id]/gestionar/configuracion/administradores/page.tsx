import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { listarMiembros } from '@/services/organizadores/listarMiembros';
import { exigirQueOrganice, obtenerContextoCacheado, obtenerGestionCacheada } from '../../_datos';
import { PanelAdministradores } from '../../PanelAdministradores';
import { CabeceraDeSeccion } from '../CabeceraDeSeccion';
import { SECCIONES_CONFIGURACION } from '../_secciones';
import styles from '../pagina.module.css';

export const metadata: Metadata = {
  title: conNombreProducto(SECCIONES_CONFIGURACION.administradores),
};

/**
 * UC-07 — El equipo de trabajo de la organización, que no es de este
 * torneo sino de todos: por eso está acá y no en "Colaboradores".
 */
export default async function PaginaAdministradores({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // El guard va acá y no sólo en el layout: en el App Router el
  // layout y la página se renderizan **en paralelo**, así que el
  // redirect del layout no llega a evitar que la página consulte. Lo
  // mostró la suite con sesión: un colaborador entrando por URL dejaba
  // un SIN_PERMISO en el log del servidor —el servicio hacía bien su
  // trabajo, pero el error viajaba a Sentry igual.
  await exigirQueOrganice(id);
  const contexto = await obtenerContextoCacheado();
  const gestion = await obtenerGestionCacheada(id);
  const administradores = await listarMiembros(
    { organizacionId: gestion.organizacionId },
    contexto,
  );

  return (
    <div className={styles.pagina}>
      <CabeceraDeSeccion torneoId={id} seccion="administradores" />
      <PanelAdministradores
        organizacionId={gestion.organizacionId}
        administradores={administradores}
        esTitular={gestion.miRolEnOrganizacion === 'owner'}
      />
    </div>
  );
}
