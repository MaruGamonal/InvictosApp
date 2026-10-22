import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { listarColaboradoresTorneo } from '@/services/organizadores/listarColaboradoresTorneo';
import { exigirQueOrganice, obtenerContextoCacheado } from '../../_datos';
import { PanelColaboradores } from '../../PanelColaboradores';
import { CabeceraDeSeccion } from '../CabeceraDeSeccion';
import { SECCIONES_CONFIGURACION } from '../_secciones';
import styles from '../pagina.module.css';

export const metadata: Metadata = {
  title: conNombreProducto(SECCIONES_CONFIGURACION.colaboradores),
};

/** UC-09 — Quién más puede cargar resultados y programar partidos de este torneo (`06`, D-32). */
export default async function PaginaColaboradores({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // El guard va acá y no sólo en el layout: en el App Router el
  // layout y la página se renderizan **en paralelo**, así que el
  // redirect del layout no llega a evitar que la página consulte. Lo
  // mostró la suite con sesión: un colaborador entrando por URL dejaba
  // un SIN_PERMISO en el log del servidor —el servicio hacía bien su
  // trabajo, pero el error viajaba a Sentry igual.
  await exigirQueOrganice(id);
  const contexto = await obtenerContextoCacheado();
  const colaboradores = await listarColaboradoresTorneo({ torneoId: id }, contexto);

  return (
    <div className={styles.pagina}>
      <CabeceraDeSeccion torneoId={id} seccion="colaboradores" />
      <PanelColaboradores torneoId={id} colaboradores={colaboradores} />
    </div>
  );
}
