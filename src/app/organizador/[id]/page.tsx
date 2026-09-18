import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Escudo } from '@/components/Escudo';
import { Badge } from '@/components/Badge';
import { EstadoVacio } from '@/components/EstadoVacio';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { esErrorDeAplicacion } from '@/lib/errores';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { conNombreProducto } from '@/lib/nombreProducto';
import {
  obtenerPerfilOrganizador,
  type PerfilOrganizador,
} from '@/services/organizadores/obtenerPerfilOrganizador';
import styles from './pagina.module.css';

/**
 * UC-08 — Perfil público del organizador (`10`, sección 5). Trayectoria
 * factual: todo torneo publicado (con inscripciones abiertas, en curso
 * o finalizado), priorizado en ese orden — override explícito de `06`,
 * D-03b pedido en vivo. El servicio ya excluye `draft` y `cancelled`.
 */

// Mismo criterio que /jugador/[id]: `cache()` deduplica generateMetadata
// y la página dentro del mismo request.
const obtenerPerfilCacheado = cache((organizacionId: string) =>
  obtenerPerfilOrganizador({ organizacionId }, CONTEXTO_PUBLICO),
);

async function obtenerPerfilOFallar(organizacionId: string): Promise<PerfilOrganizador> {
  try {
    return await obtenerPerfilCacheado(organizacionId);
  } catch (error) {
    if (esErrorDeAplicacion(error) && error.codigo === 'NO_ENCONTRADO') notFound();
    throw error;
  }
}

/** Años completos desde el alta — nunca negativo, aunque el reloj del cliente esté mal. */
function aniosActivo(fechaAltaIso: string): number {
  const milisegundosPorAnio = 365.25 * 24 * 60 * 60 * 1000;
  const transcurrido = Date.now() - new Date(fechaAltaIso).getTime();
  return Math.max(0, Math.floor(transcurrido / milisegundosPorAnio));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  let perfil: PerfilOrganizador;
  try {
    perfil = await obtenerPerfilCacheado(id);
  } catch {
    return {};
  }

  return {
    title: conNombreProducto(perfil.nombre),
    description: perfil.descripcion ?? undefined,
    openGraph: {
      title: perfil.nombre,
      description: perfil.descripcion ?? undefined,
      images: perfil.logoUrl ? [{ url: perfil.logoUrl }] : undefined,
    },
  };
}

export default async function PaginaPerfilOrganizador({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await obtenerPerfilOFallar(id);

  return (
    <div className={styles.pagina}>
      <header className={styles.hero}>
        <div className={styles.heroContenido}>
          <Escudo src={perfil.logoUrl} nombre={perfil.nombre} tamano={64} />
          <div className={styles.heroTexto}>
            <h1 className={`${styles.nombre} fuente-display`}>{perfil.nombre}</h1>
            <div className={styles.meta}>
              {perfil.ciudad && <span>{perfil.ciudad.nombre}</span>}
              <Badge campo="organizacion.nivelVerificacion" valor={perfil.nivelVerificacion} />
            </div>
          </div>
        </div>
      </header>

      <main className={styles.contenido}>
        {perfil.descripcion && <p className={styles.descripcion}>{perfil.descripcion}</p>}

        <div className={styles.gridStats}>
          <div className={styles.stat}>
            <span className={`${styles.statValor} fuente-display`}>
              {perfil.trayectoria.length}
            </span>
            <span className={styles.statEtiqueta}>Organizados</span>
          </div>
          <div className={styles.stat}>
            <span className={`${styles.statValor} fuente-display`}>
              {perfil.trayectoria.filter((t) => t.estado === 'finished').length}
            </span>
            <span className={styles.statEtiqueta}>Finalizados</span>
          </div>
          <div className={styles.stat}>
            <span className={`${styles.statValor} fuente-display`}>
              {aniosActivo(perfil.fechaAlta)}
            </span>
            <span className={styles.statEtiqueta}>Años activo</span>
          </div>
        </div>
        <p className={styles.caption}>
          Trayectoria factual, no un puntaje: es lo único que se muestra hasta que haya volumen para
          mostrar más.
        </p>

        <section>
          <h2 className={styles.tituloSeccion}>Trayectoria</h2>
          {perfil.trayectoria.length === 0 ? (
            <EstadoVacio mensaje="Todavía no tiene torneos publicados." />
          ) : (
            <div className={styles.listaTrayectoria}>
              {perfil.trayectoria.map((torneo) => (
                <Link key={torneo.id} href={`/torneo/${torneo.id}`} className={styles.filaTorneo}>
                  <div className={styles.filaTorneoCabecera}>
                    <span className={styles.nombreTorneo}>{torneo.nombre}</span>
                    <Badge campo="torneo.modalidad" valor={torneo.modalidad} />
                  </div>
                  <div className={styles.filaTorneoDatos}>
                    <span>
                      {obtenerEtiqueta('torneo.categoriaEdad', torneo.categoriaEdad).etiqueta}
                    </span>
                    <Badge campo="torneo.estado" valor={torneo.estado} />
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
