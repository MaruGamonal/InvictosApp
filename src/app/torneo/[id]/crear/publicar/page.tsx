import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { obtenerResumenParaPublicar } from '@/services/torneos/obtenerResumenParaPublicar';
import { esErrorDeAplicacion } from '@/lib/errores';
import { conNombreProducto } from '@/lib/nombreProducto';
import { PanelPublicarTorneo } from '@/components/PanelPublicarTorneo';
import styles from '@/app/ingresar/pagina.module.css';
import pasoStyles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Listo para publicar') };

/**
 * UC-16/UC-18 — Último paso del alta de torneo (Flujo 3 del paquete de
 * diseño): publicar pasa el torneo de `draft` a `registration_open`.
 * Si ya se publicó (por ejemplo, volviendo atrás en el navegador),
 * manda directo a la gestión en vez de repetir el paso.
 *
 * El panel es el mismo que ofrece el Resumen de la gestión: lo único
 * propio de esta pantalla es ser el final de un recorrido —de ahí el
 * título y la ciudad arriba, y que al publicar se vaya a la gestión en
 * vez de quedarse donde está.
 */
export default async function PaginaPublicarInicial({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  let resumen;
  try {
    resumen = await obtenerResumenParaPublicar({ torneoId: id }, contexto);
  } catch (error) {
    if (esErrorDeAplicacion(error) && error.codigo === 'SIN_PERMISO') redirect(`/torneo/${id}`);
    throw error;
  }

  if (resumen.torneoEstado !== 'draft') redirect(`/torneo/${id}/gestionar`);

  return (
    <div className={styles.pagina}>
      <div className={styles.tarjeta}>
        <h1 className={`fuente-display ${styles.titulo}`}>Listo para publicar</h1>
        <p className={pasoStyles.breadcrumb}>· {resumen.ciudadNombre}</p>

        <PanelPublicarTorneo
          torneoId={id}
          organizacionId={resumen.organizacionId}
          soyTitular={resumen.soyTitular}
          organizacionVerificada={resumen.organizacionVerificada}
          limitePublicadosAlcanzado={resumen.limitePublicadosAlcanzado}
          camposFaltantes={resumen.camposFaltantes}
          destinoAlPublicar={`/torneo/${id}/gestionar`}
        />
      </div>
    </div>
  );
}
