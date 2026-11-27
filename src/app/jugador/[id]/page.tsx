import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { esIdentificador } from '@/lib/validacion';
import Link from 'next/link';
import { Escudo } from '@/components/Escudo';
import { MarcaInvicta } from '@/components/marca/MarcaInvicta';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { esErrorDeAplicacion } from '@/lib/errores';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { conNombreProducto } from '@/lib/nombreProducto';
import {
  obtenerPerfilPublico,
  type PerfilPublico,
} from '@/services/identidad/obtenerPerfilPublico';
import { obtenerHistorialDelJugador } from '@/services/identidad/obtenerHistorialDelJugador';
import { NumerosDelJugador } from '@/components/historial/NumerosDelJugador';
import { TorneosJugados } from '@/components/historial/TorneosJugados';
import styles from './pagina.module.css';

/**
 * UC-03 — Perfil público del jugador (`10`, sección 5). Un perfil
 * `restricted` oculta foto/posición/ciudad, nunca el nombre ni los
 * equipos (`02`, UC-04) — el servicio ya resuelve ese filtro.
 *
 * UC-38 — Y debajo, el historial torneo por torneo, que es lo que
 * convierte esta pantalla de tarjeta de presentación en algo a lo que
 * volver. Va después de Equipos porque responde otra pregunta: Equipos
 * dice con quién juega hoy, el historial dice qué jugó.
 */

// `generateMetadata` y la página piden el mismo perfil; `cache()` de React
// deduplica ambas llamadas dentro del mismo request (sin esto, el sin-caché
// deliberado de este perfil — a diferencia de equipo/torneo — duplicaba el
// trabajo contra la base en cada visita).
const obtenerPerfilCacheado = cache((perfilId: string) =>
  obtenerPerfilPublico({ perfilId }, CONTEXTO_PUBLICO),
);

async function obtenerPerfilOFallar(perfilId: string): Promise<PerfilPublico> {
  // Un id con forma inválida ni se consulta: el texto llegaba hasta
  // Postgres, que lo rechaza por no ser un UUID, y la página moría con
  // un 500 en vez de mostrar su 404.
  if (!esIdentificador(perfilId)) notFound();
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
  // Después del perfil y no en paralelo: si el id no existe, la página
  // ya cortó con su 404 y esta consulta no llega a hacerse.
  const historial = await obtenerHistorialDelJugador({ perfilId: perfil.id }, CONTEXTO_PUBLICO);

  return (
    <div className={styles.pagina}>
      <header className={styles.hero}>
        <MarcaInvicta />
        <div className={styles.heroContenido}>
          <Escudo src={perfil.fotoUrl} nombre={perfil.nombreVisible} tamano={64} />
          <div className={styles.heroTexto}>
            <h1 className={`${styles.nombre} fuente-display`}>{perfil.nombreVisible}</h1>
            {/* La ciudad se sacó de la cabecera a pedido: lo que
                identifica a alguien acá es su nombre y su posición, y
                dónde vive no cambia nada de lo que se ve abajo. Se
                sigue guardando y sigue siendo lo que `restricted`
                oculta. */}
            {perfil.posicion && (
              <div className={styles.meta}>
                <span>{obtenerEtiqueta('perfilDeportivo.posicion', perfil.posicion).etiqueta}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className={styles.contenido}>
        {historial.length > 0 && (
          <section className={styles.seccionNumeros}>
            <h2 className={styles.tituloSeccion}>Números</h2>
            <NumerosDelJugador historial={historial} />
          </section>
        )}

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

        {historial.length > 0 && (
          <section>
            <h2 className={styles.tituloSeccion}>Torneos jugados</h2>
            <TorneosJugados historial={historial} />
          </section>
        )}
      </main>
    </div>
  );
}
