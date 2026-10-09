import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerGestionCacheada } from '../../_datos';
import { FormularioReglasDelTorneo } from '../../FormularioReglasDelTorneo';
import { CabeceraDeSeccion } from '../CabeceraDeSeccion';
import { SECCIONES_CONFIGURACION } from '../_secciones';
import styles from '../pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto(SECCIONES_CONFIGURACION.reglas) };

const ESTADOS_CON_RESULTADO = new Set(['played', 'walkover']);

/**
 * UC-19 — Cómo se juega y cómo se cuenta: tamaño de las listas de buena
 * fe, puntaje, quién carga resultados, qué pasa con un abandono y el
 * marcador de un partido ganado por presentación.
 *
 * Es la sección que faltaba: estos parámetros existían en la tabla y en
 * la API desde T9, y ninguna pantalla los mostraba.
 */
export default async function PaginaReglas({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestion = await obtenerGestionCacheada(id);

  return (
    <div className={styles.pagina}>
      <CabeceraDeSeccion torneoId={id} seccion="reglas" />
      <FormularioReglasDelTorneo
        torneoId={id}
        reglas={gestion.reglas}
        hayPartidosJugados={gestion.partidos.some((p) => ESTADOS_CON_RESULTADO.has(p.estado))}
      />
    </div>
  );
}
