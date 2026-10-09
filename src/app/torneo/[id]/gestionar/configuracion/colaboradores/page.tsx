import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { listarColaboradoresTorneo } from '@/services/organizadores/listarColaboradoresTorneo';
import { obtenerContextoCacheado } from '../../_datos';
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
  const contexto = await obtenerContextoCacheado();
  const colaboradores = await listarColaboradoresTorneo({ torneoId: id }, contexto);

  return (
    <div className={styles.pagina}>
      <CabeceraDeSeccion torneoId={id} seccion="colaboradores" />
      <PanelColaboradores torneoId={id} colaboradores={colaboradores} />
    </div>
  );
}
