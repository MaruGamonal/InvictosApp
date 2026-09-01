import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Escudo } from '@/components/Escudo';
import { Badge } from '@/components/Badge';
import { EstadoVacio } from '@/components/EstadoVacio';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { esErrorDeAplicacion } from '@/lib/errores';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import {
  obtenerPerfilOrganizador,
  type PerfilOrganizador,
} from '@/services/organizadores/obtenerPerfilOrganizador';
import styles from './pagina.module.css';

/**
 * UC-08 — Perfil público del organizador (`10`, sección 5). Solo
 * trayectoria factual: torneos finalizados (`06`, D-03b) — el servicio
 * ya excluye los cancelados y los que no terminaron.
 */

async function obtenerPerfilOFallar(organizacionId: string): Promise<PerfilOrganizador> {
  try {
    return await obtenerPerfilOrganizador({ organizacionId }, CONTEXTO_PUBLICO);
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
  let perfil: PerfilOrganizador;
  try {
    perfil = await obtenerPerfilOrganizador({ organizacionId: id }, CONTEXTO_PUBLICO);
  } catch {
    return {};
  }

  return {
    title: `${perfil.nombre} — INVICTOS`,
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
              <span>
                {
                  obtenerEtiqueta('organizacion.nivelVerificacion', perfil.nivelVerificacion)
                    .etiqueta
                }
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.contenido}>
        {perfil.descripcion && <p className={styles.descripcion}>{perfil.descripcion}</p>}

        <section>
          <h2 className={styles.tituloSeccion}>Trayectoria</h2>
          {perfil.trayectoria.length === 0 ? (
            <EstadoVacio mensaje="Todavía no finalizó ningún torneo." />
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
