import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Escudo } from '@/components/Escudo';
import { EstadoVacio } from '@/components/EstadoVacio';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { esErrorDeAplicacion } from '@/lib/errores';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerRanking } from '@/services/equipos/obtenerRanking';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Ranking') };

/**
 * Ranking acotado a la ciudad, modalidad y categoría del equipo desde
 * el que se entra — no existe un ranking global (`06`, 5.4). Sin
 * ciudad o modalidad definidas en el equipo, no hay con qué comparar.
 */
export default async function PaginaRanking({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let ranking;
  try {
    ranking = await obtenerRanking({ equipoId: id }, CONTEXTO_PUBLICO);
  } catch (error) {
    if (esErrorDeAplicacion(error) && error.codigo === 'NO_ENCONTRADO') notFound();
    throw error;
  }

  return (
    <div className={styles.pagina}>
      <Link href={`/equipo/${id}`} className={styles.enlaceVolver}>
        ← Volver
      </Link>
      <h1 className={`fuente-display ${styles.titulo}`}>Rankings</h1>

      {!ranking.disponible ? (
        <EstadoVacio mensaje="Este equipo todavía no tiene ciudad y modalidad definidas — hacen falta las dos para armar un ranking." />
      ) : (
        <>
          <div className={styles.chips}>
            <span className={styles.chip}>{ranking.ciudadNombre}</span>
            <span className={styles.chip}>
              {obtenerEtiqueta('torneo.modalidad', ranking.modalidad).etiqueta}
            </span>
            <span className={styles.chip}>
              {obtenerEtiqueta('torneo.categoriaGenero', ranking.categoriaGenero).etiqueta}
            </span>
          </div>
          <p className={styles.texto}>
            Acotado a esta zona, modalidad y categoría — leídas del equipo, no de los torneos que
            jugó.
          </p>

          {ranking.equipos.length === 0 ? (
            <EstadoVacio mensaje="Todavía no hay equipos con score en esta zona, modalidad y categoría." />
          ) : (
            <ol className={styles.lista}>
              {ranking.equipos.map((equipo, indice) => (
                <li
                  key={equipo.equipoId}
                  className={equipo.esElEquipoActual ? styles.filaPropia : styles.fila}
                >
                  <span className={styles.posicion}>{indice + 1}</span>
                  <Escudo src={equipo.escudoUrl} nombre={equipo.nombre} tamano={32} />
                  <Link href={`/equipo/${equipo.equipoId}`} className={styles.nombreEquipo}>
                    {equipo.nombre}
                  </Link>
                  <span className={styles.valor}>{equipo.valor}</span>
                </li>
              ))}
            </ol>
          )}

          <p className={styles.textoAyuda}>
            No existe un ranking global: comparar un {obtenerEtiqueta('torneo.modalidad', ranking.modalidad).etiqueta} de
            esta ciudad con otra modalidad o ciudad no significa nada.
          </p>
        </>
      )}
    </div>
  );
}
