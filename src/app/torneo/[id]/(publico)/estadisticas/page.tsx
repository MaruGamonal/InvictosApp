import type { Metadata } from 'next';
import { Escudo } from '@/components/Escudo';
import { EstadoVacio } from '@/components/EstadoVacio';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerEstadisticasCacheadas, obtenerFichaOFallar } from '../../_datos';
import styles from './pagina.module.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [ficha, estadisticas] = await Promise.all([
    obtenerFichaOFallar(id),
    obtenerEstadisticasCacheadas(id),
  ]);
  const lider = estadisticas?.goleadores[0];
  const descripcion = lider ? `${lider.nombreVisible} lidera la tabla de goleadores` : 'Estadísticas del torneo';

  return {
    title: conNombreProducto(`Estadísticas — ${ficha.nombre}`),
    description: descripcion,
    openGraph: { title: ficha.nombre, description: descripcion },
  };
}

/**
 * UC-36 (`11`, T31) — Goleadores y tarjetas: lee lo que `cargarResultado`
 * (T30) acumuló en `estadistica_jugador`. La carga de eventos es siempre
 * opcional (`06`, D-26), así que un torneo con resultados puede no tener
 * nada acá — la pantalla lo explica, no muestra una tabla vacía.
 */
export default async function PaginaEstadisticas({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const estadisticas = await obtenerEstadisticasCacheadas(id);

  if (!estadisticas || (estadisticas.goleadores.length === 0 && estadisticas.tarjetas.length === 0)) {
    return (
      <EstadoVacio mensaje="Todavía nadie cargó goleadores ni tarjetas de este torneo — es un dato opcional al cargar cada resultado." />
    );
  }

  return (
    <div className={styles.pagina}>
      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Goleadores</h2>
        {estadisticas.goleadores.length === 0 ? (
          <p className={styles.textoVacioChico}>Todavía no hay goles atribuidos a nadie.</p>
        ) : (
          <ol className={styles.lista}>
            {estadisticas.goleadores.map((goleador, indice) => (
              <li key={goleador.perfilId} className={styles.fila}>
                <span className={styles.posicion}>{indice + 1}</span>
                <Escudo src={goleador.equipoEscudoUrl} nombre={goleador.equipoNombre} tamano={32} />
                <span className={styles.nombreYEquipo}>
                  <span className={styles.nombre}>{goleador.nombreVisible}</span>
                  <span className={styles.equipo}>{goleador.equipoNombre}</span>
                </span>
                <span className={styles.valor}>{goleador.goles}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Tarjetas</h2>
        {estadisticas.tarjetas.length === 0 ? (
          <p className={styles.textoVacioChico}>Todavía no hay tarjetas registradas.</p>
        ) : (
          <ul className={styles.lista}>
            {estadisticas.tarjetas.map((persona) => (
              <li key={persona.perfilId} className={styles.fila}>
                <Escudo src={persona.equipoEscudoUrl} nombre={persona.equipoNombre} tamano={32} />
                <span className={styles.nombreYEquipo}>
                  <span className={styles.nombre}>{persona.nombreVisible}</span>
                  <span className={styles.equipo}>{persona.equipoNombre}</span>
                </span>
                <span className={styles.tarjetas}>
                  {persona.tarjetasAmarillas > 0 && (
                    <span className={styles.chipAmarilla}>{persona.tarjetasAmarillas}</span>
                  )}
                  {persona.tarjetasRojas > 0 && (
                    <span className={styles.chipRoja}>{persona.tarjetasRojas}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
