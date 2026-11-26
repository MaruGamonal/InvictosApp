import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { obtenerResumenBajaDelTorneo } from '@/services/inscripciones/obtenerResumenBajaDelTorneo';
import { esErrorDeAplicacion } from '@/lib/errores';
import { conNombreProducto } from '@/lib/nombreProducto';
import { PanelDarDeBaja } from './PanelDarDeBaja';
import styles from './pagina.module.css';
import { CabeceraDeTarea } from '@/components/CabeceraDeTarea';

export const metadata: Metadata = { title: conNombreProducto('Dar de baja del torneo') };

const ESTADOS_TERMINALES = new Set(['withdrawn', 'excluded', 'rejected']);

/** UC-28 — El Capitán retira a su equipo de este torneo. */
export default async function PaginaDarDeBaja({
  params,
}: {
  params: Promise<{ id: string; equipoId: string }>;
}) {
  const { id, equipoId } = await params;
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  let resumen;
  try {
    resumen = await obtenerResumenBajaDelTorneo({ torneoId: id, equipoId }, contexto);
  } catch (error) {
    if (
      esErrorDeAplicacion(error) &&
      (error.codigo === 'SIN_PERMISO' || error.codigo === 'NO_ENCONTRADO')
    ) {
      redirect(`/torneo/${id}`);
    }
    throw error;
  }

  return (
    <main className={styles.pagina}>
      <CabeceraDeTarea
        volverA={`/torneo/${id}`}
        contexto={`${resumen.equipoNombre} · ${resumen.torneoNombre}`}
        titulo="Dar de baja"
      />

      {ESTADOS_TERMINALES.has(resumen.inscripcionEstado) ? (
        <p className={styles.avisoCerrada}>
          Este equipo ya no tiene una inscripción activa en este torneo.
        </p>
      ) : (
        <PanelDarDeBaja
          torneoId={id}
          equipoId={equipoId}
          torneoEnCurso={resumen.torneoEstado === 'in_progress'}
        />
      )}
    </main>
  );
}
