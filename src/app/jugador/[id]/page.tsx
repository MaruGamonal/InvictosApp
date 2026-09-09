import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Escudo } from '@/components/Escudo';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { esErrorDeAplicacion } from '@/lib/errores';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { conNombreProducto } from '@/lib/nombreProducto';
import {
  obtenerPerfilPublico,
  type PerfilPublico,
} from '@/services/identidad/obtenerPerfilPublico';
import styles from './pagina.module.css';

/**
 * UC-03 — Perfil público del jugador (`10`, sección 5). Un perfil
 * `restricted` oculta foto/posición/ciudad, nunca el nombre ni los
 * equipos (`02`, UC-04) — el servicio ya resuelve ese filtro.
 */

// `generateMetadata` y la página piden el mismo perfil; `cache()` de React
// deduplica ambas llamadas dentro del mismo request (sin esto, el sin-caché
// deliberado de este perfil — a diferencia de equipo/torneo — duplicaba el
// trabajo contra la base en cada visita).
const obtenerPerfilCacheado = cache((perfilId: string) =>
  obtenerPerfilPublico({ perfilId }, CONTEXTO_PUBLICO),
);

async function obtenerPerfilOFallar(perfilId: string): Promise<PerfilPublico> {
  try {
    return await obtenerPerfilCacheado(perfilId);
  } catch (error) {
    if (esErrorDeAplicacion(error) && error.codigo === 'NO_ENCONTRADO') notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  let perfil: PerfilPublico;
  try {
    perfil = await obtenerPerfilCacheado(id);
  } catch {
    return {};
  }

  return {
    title: conNombreProducto(perfil.nombreVisible),
    openGraph: {
      title: perfil.nombreVisible,
      images: perfil.fotoUrl ? [{ url: perfil.fotoUrl }] : undefined,
    },
  };
}

function comoAño(fechaIso: string | null): string | null {
  if (!fechaIso) return null;
  const año = new Date(fechaIso).getFullYear();
  return Number.isNaN(año) ? null : String(año);
}

export default async function PaginaPerfilPublico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await obtenerPerfilOFallar(id);

  return (
    <div className={styles.pagina}>
      <header className={styles.hero}>
        <div className={styles.heroContenido}>
          <Escudo src={perfil.fotoUrl} nombre={perfil.nombreVisible} tamano={64} />
          <div className={styles.heroTexto}>
            <h1 className={`${styles.nombre} fuente-display`}>{perfil.nombreVisible}</h1>
            {(perfil.posicion || perfil.ciudadNombre) && (
              <div className={styles.meta}>
                {perfil.posicion && (
                  <span>
                    {obtenerEtiqueta('perfilDeportivo.posicion', perfil.posicion).etiqueta}
                  </span>
                )}
                {perfil.posicion && perfil.ciudadNombre && <span aria-hidden>·</span>}
                {perfil.ciudadNombre && <span>{perfil.ciudadNombre}</span>}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className={styles.contenido}>
        <section>
          <h2 className={styles.tituloSeccion}>Equipos</h2>
          {perfil.equipos.length === 0 ? (
            <p className={styles.sinEquipos}>Todavía no integra ningún equipo.</p>
          ) : (
            <ul className={styles.listaEquipos}>
              {perfil.equipos.map((equipo) => {
                const inicio = comoAño(equipo.temporadaInicio);
                const fin = equipo.esActual ? 'presente' : comoAño(equipo.temporadaFin);
                return (
                  <li key={equipo.id} className={styles.equipo}>
                    <Link href={`/equipo/${equipo.id}`} className={styles.enlaceEquipo}>
                      <Escudo src={equipo.escudoUrl} nombre={equipo.nombre} tamano={40} />
                      <div className={styles.equipoTexto}>
                        <span className={styles.equipoNombre}>{equipo.nombre}</span>
                        <span className={styles.equipoDetalle}>
                          {inicio && fin && `${inicio} — ${fin} · `}
                          {obtenerEtiqueta('integranteEquipo.rolEquipo', equipo.rolEquipo).etiqueta}
                        </span>
                      </div>
                      {equipo.esActual && <span className={styles.badgeActual}>Actual</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
