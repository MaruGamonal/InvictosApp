import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerGestionCacheada } from '../../_datos';
import { PanelDivisiones } from '../../PanelDivisiones';
import { CabeceraDeSeccion } from '../CabeceraDeSeccion';
import { SECCIONES_CONFIGURACION } from '../_secciones';
import styles from '../pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto(SECCIONES_CONFIGURACION.divisiones) };

/** UC-16 (paso 5) — Otras categorías competitivas del mismo evento (`06`, D-103). */
export default async function PaginaDivisiones({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestion = await obtenerGestionCacheada(id);

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
