import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerGestionCacheada } from '../../_datos';
import { AccionesEstadoTorneo } from '../../AccionesEstadoTorneo';
import { ESTADOS_CON_ACCIONES_DE_ESTADO } from '../../_estadosDeTorneo';
import { PanelCancelarTorneo } from '../../PanelCancelarTorneo';
import { CabeceraDeSeccion } from '../CabeceraDeSeccion';
import { SECCIONES_CONFIGURACION } from '../_secciones';
import stylesCompartidos from '../../pagina.module.css';
import styles from '../pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto(SECCIONES_CONFIGURACION.estado) };

/**
 * UC-20/UC-21 — Avanzar el estado de un torneo ya publicado, y la
 * salida más drástica: interrumpirlo.
 *
 * "Interrumpir el torneo" vive acá y no aparte porque es la misma
 * pregunta —¿en qué estado está esto?—, solo que con la respuesta de la
 * que no se vuelve.
 *
 * Publicar **no** está acá: en borrador esta pantalla ni siquiera
 * existe. Se publica desde el Resumen.
 */
export default async function PaginaEstado({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestion = await obtenerGestionCacheada(id);

  // El menú no ofrece esta fila fuera de esos estados, pero la URL se
  // puede escribir a mano: sin acciones que ofrecer, de vuelta al menú.
  if (!ESTADOS_CON_ACCIONES_DE_ESTADO.has(gestion.estado)) {
    redirect(`/torneo/${id}/gestionar/configuracion`);
  }

  return (
    <div className={styles.pagina}>
      <CabeceraDeSeccion torneoId={id} seccion="estado" />
      <AccionesEstadoTorneo
        torneoId={id}
        estado={gestion.estado}
        tienePartidos={gestion.partidos.length > 0}
      />

      <div className={stylesCompartidos.seccionPeligro}>
        <h3 className={stylesCompartidos.tituloSeccion}>Interrumpir el torneo</h3>
        <PanelCancelarTorneo torneoId={id} />
      </div>
    </div>
  );
}
