import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { listarReglamentos } from '@/services/torneos/listarReglamentos';
import { obtenerContextoCacheado } from '../../_datos';
import { FormularioReglamentoOrganizador } from '../../FormularioReglamentoOrganizador';
import { CabeceraDeSeccion } from '../CabeceraDeSeccion';
import { SECCIONES_CONFIGURACION } from '../_secciones';
import styles from '../pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto(SECCIONES_CONFIGURACION.reglamento) };

/** UC-51 — Publicar una versión nueva del reglamento. */
export default async function PaginaReglamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
