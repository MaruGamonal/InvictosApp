import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { listarReglamentos } from '@/services/torneos/listarReglamentos';
import { exigirQueOrganice, obtenerContextoCacheado } from '../../_datos';
import { FormularioReglamentoOrganizador } from '../../FormularioReglamentoOrganizador';
import { CabeceraDeSeccion } from '../CabeceraDeSeccion';
import { SECCIONES_CONFIGURACION } from '../_secciones';
import styles from '../pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto(SECCIONES_CONFIGURACION.reglamento) };

/** UC-51 — Publicar una versión nueva del reglamento. */
export default async function PaginaReglamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // El guard va acá y no sólo en el layout: en el App Router el
  // layout y la página se renderizan **en paralelo**, así que el
  // redirect del layout no llega a evitar que la página consulte. Lo
  // mostró la suite con sesión: un colaborador entrando por URL dejaba
  // un SIN_PERMISO en el log del servidor —el servicio hacía bien su
  // trabajo, pero el error viajaba a Sentry igual.
  await exigirQueOrganice(id);
  const contexto = await obtenerContextoCacheado();
  const reglamentos = await listarReglamentos({ torneoId: id }, contexto);
  const vigente = reglamentos.find((r) => r.estado === 'current') ?? null;

  return (
    <div className={styles.pagina}>
      <CabeceraDeSeccion torneoId={id} seccion="reglamento" />
      <FormularioReglamentoOrganizador torneoId={id} vigente={vigente} />
    </div>
  );
}
