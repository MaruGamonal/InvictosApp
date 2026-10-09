import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerGestionCacheada } from '../../_datos';
import { FormularioEditarTorneo } from '../../FormularioEditarTorneo';
import { CabeceraDeSeccion } from '../CabeceraDeSeccion';
import { SECCIONES_CONFIGURACION } from '../_secciones';
import styles from '../pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto(SECCIONES_CONFIGURACION.datos) };

/** UC-16 — Lo que describe al torneo: nombre, sede, fechas, cupo y costos. */
export default async function PaginaDatos({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestion = await obtenerGestionCacheada(id);

  return (
    <div className={styles.pagina}>
      <CabeceraDeSeccion torneoId={id} seccion="datos" />
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
    </div>
  );
}
