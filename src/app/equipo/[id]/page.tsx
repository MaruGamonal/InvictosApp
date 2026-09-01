import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Escudo } from '@/components/Escudo';
import { Badge } from '@/components/Badge';
import { EstadoVacio } from '@/components/EstadoVacio';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { esErrorDeAplicacion } from '@/lib/errores';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { cachearLecturaDeEquipo } from '@/lib/cache';
import { obtenerEquipoPublico, type EquipoPublico } from '@/services/equipos/obtenerEquipoPublico';
import styles from './pagina.module.css';

/**
 * UC-14/UC-37 — Perfil público del equipo (`10`, sección 5). Cabecera
 * en superficie oscura de identidad, cuerpo en claro (`08`, 6.1).
 * Caché con invalidación por evento: `cargarResultado`, `registrarNoDisputado`
 * y `darDeBajaDelTorneo` (T15/T16/T17) ya invalidan `equipo:<id>` desde
 * T21 — acá solo hacía falta el lado de lectura.
 */

async function obtenerEquipoCacheado(equipoId: string): Promise<EquipoPublico | null> {
  try {
    return await cachearLecturaDeEquipo('equipo-publico', equipoId, () =>
      obtenerEquipoPublico({ equipoId }, CONTEXTO_PUBLICO),
    )();
  } catch (error) {
    if (esErrorDeAplicacion(error) && error.codigo === 'NO_ENCONTRADO') return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const equipo = await obtenerEquipoCacheado(id);
  if (!equipo) return {};
  const descripcion = equipo.ciudad?.nombre ?? 'Perfil público del equipo';

  return {
    title: `${equipo.nombre} — INVICTOS`,
    description: descripcion,
    openGraph: {
      title: equipo.nombre,
      description: descripcion,
      images: equipo.escudoUrl ? [{ url: equipo.escudoUrl }] : undefined,
    },
  };
}

export default async function PaginaEquipoPublico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const equipo = await obtenerEquipoCacheado(id);
  if (!equipo) notFound();

  return (
    <div className={styles.pagina}>
      <header className={styles.hero}>
        <div className={styles.heroContenido}>
          <Escudo src={equipo.escudoUrl} nombre={equipo.nombre} tamano={64} />
          <div className={styles.heroTexto}>
            <h1 className={`${styles.nombre} fuente-display`}>{equipo.nombre}</h1>
            <div className={styles.meta}>
              {equipo.ciudad && <span>{equipo.ciudad.nombre}</span>}
              <span>
                {obtenerEtiqueta('torneo.categoriaGenero', equipo.categoriaGenero).etiqueta}
              </span>
              {equipo.modalidadHabitual && (
                <span>
                  {obtenerEtiqueta('torneo.modalidad', equipo.modalidadHabitual).etiqueta}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={styles.contenido}>
        <section className={styles.seccionScore}>
          <span className={styles.etiquetaScore}>Score</span>
          <span className={styles.sinScore}>Sin score todavía</span>
        </section>

        <section>
          <h2 className={styles.tituloSeccion}>Plantel</h2>
          {equipo.plantel.length === 0 ? (
            <EstadoVacio mensaje="Este equipo todavía no cargó su plantel." />
          ) : (
            <ul className={styles.listaIntegrantes}>
              {equipo.plantel.map((integrante) => (
                <li key={integrante.perfilId} className={styles.integrante}>
                  <Link
                    href={`/jugador/${integrante.perfilId}`}
                    className={styles.enlaceIntegrante}
                  >
                    {integrante.nombreVisible}
                  </Link>
                  <span className={styles.rolIntegrante}>
                    {obtenerEtiqueta('integranteEquipo.rolEquipo', integrante.rolEquipo).etiqueta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {equipo.cuerpoTecnico.length > 0 && (
          <section>
            <h2 className={styles.tituloSeccion}>Cuerpo técnico</h2>
            <ul className={styles.listaIntegrantes}>
              {equipo.cuerpoTecnico.map((integrante) => (
                <li key={integrante.perfilId} className={styles.integrante}>
                  <Link
                    href={`/jugador/${integrante.perfilId}`}
                    className={styles.enlaceIntegrante}
                  >
                    {integrante.nombreVisible}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className={styles.tituloSeccion}>Historial</h2>
          {equipo.historial.length === 0 ? (
            <EstadoVacio mensaje="Este equipo todavía no jugó ningún torneo." />
          ) : (
            <div className={styles.listaHistorial}>
              {equipo.historial.map((torneo) => (
                <Link
                  key={torneo.torneoId}
                  href={`/torneo/${torneo.torneoId}`}
                  className={styles.filaHistorial}
                >
                  <div className={styles.filaHistorialCabecera}>
                    <span className={styles.nombreTorneo}>{torneo.torneoNombre}</span>
                    <Badge campo="torneo.estado" valor={torneo.torneoEstado} />
                  </div>
                  <div className={styles.filaHistorialDatos}>
                    <span>PJ {torneo.partidosJugados}</span>
                    <span>G {torneo.ganados}</span>
                    <span>E {torneo.empatados}</span>
                    <span>P {torneo.perdidos}</span>
                    <span>
                      GF-GC {torneo.golesFavor}-{torneo.golesContra}
                    </span>
                    <span className={styles.puntosHistorial}>
                      {torneo.puntos + torneo.ajustePuntos} pts
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
