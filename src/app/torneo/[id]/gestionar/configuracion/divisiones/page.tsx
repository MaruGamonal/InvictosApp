import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { exigirQueOrganice } from '../../_datos';
import { PanelDivisiones } from '../../PanelDivisiones';
import { CabeceraDeSeccion } from '../CabeceraDeSeccion';
import { SECCIONES_CONFIGURACION } from '../_secciones';
import styles from '../pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto(SECCIONES_CONFIGURACION.divisiones) };

/** UC-16 (paso 5) — Otras categorías competitivas del mismo evento (`06`, D-103). */
export default async function PaginaDivisiones({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // El guard va acá y no sólo en el layout: en el App Router el
  // layout y la página se renderizan **en paralelo**, así que el
  // redirect del layout no llega a evitar que la página consulte. Lo
  // mostró la suite con sesión: un colaborador entrando por URL dejaba
  // un SIN_PERMISO en el log del servidor —el servicio hacía bien su
  // trabajo, pero el error viajaba a Sentry igual.
  const gestion = await exigirQueOrganice(id);

  return (
    <div className={styles.pagina}>
      <CabeceraDeSeccion torneoId={id} seccion="divisiones" />
      <PanelDivisiones
        torneoId={id}
        certamenId={gestion.certamenId}
        division={gestion.division}
        divisionesDelCertamen={gestion.divisionesDelCertamen}
      />
    </div>
  );
}
