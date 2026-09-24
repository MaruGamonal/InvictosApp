import type { ReactNode } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { Escudo } from '@/components/Escudo';
import { BotonSeguir } from '@/components/BotonSeguir';
import { BotonInscribirEquipo } from '@/components/BotonInscribirEquipo';
import { CompartirBoton } from '@/components/CompartirBoton';
import { MarcaInvicta } from '@/components/marca/MarcaInvicta';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { formatearCantidadSeguidores } from '@/lib/seguidores';
import { obtenerFichaOFallar, obtenerReglamentosCacheados } from '../_datos';
import styles from './layout.module.css';

/**
 * Cabecera y navegación compartidas por las cuatro rutas públicas del
 * torneo (`10`, sección 5): un único fetch cacheado de la ficha
 * (`_datos.ts`) resuelve nombre, estado e imagen para las cuatro, sin
 * repetir el trabajo — Next dedupe por la misma clave de caché dentro
 * del mismo request. Densidad amplia acá, compacta en el contenido de
 * cada pestaña (`08`, 6.5).
 *
 * **Las acciones van en la cabecera**, junto al nombre, igual que en el
 * perfil del equipo: pedido en vivo, las dos pantallas hacen lo mismo y
 * se veían distintas. Estaban en el cuerpo de la pestaña "Ficha", así
 * que además desaparecían al pasar a Fixture o Tabla — se podía estar
 * mirando el fixture de un torneo y no tener cómo seguirlo.
 */
export default async function LayoutTorneo({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ficha = await obtenerFichaOFallar(id);
  const urlDelSitio = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  // El reglamento solo hace falta para inscribirse, que es lo único que
  // lo pide; fuera de "inscripciones abiertas" ni se consulta.
  const reglamentos =
    ficha.estado === 'registration_open' ? await obtenerReglamentosCacheados(id) : null;
  const reglamentoVigente = reglamentos?.find((r) => r.estado === 'current') ?? null;

  return (
    <div className={styles.pagina}>
      <header className={styles.hero}>
        <MarcaInvicta />
        <div className={styles.heroContenido}>
          <Escudo src={ficha.imagenUrl} nombre={ficha.nombre} tamano={80} />
          <div className={styles.heroTexto}>
            <h1 className={`${styles.nombre} fuente-display`}>{ficha.nombre}</h1>
            {ficha.certamenNombre && (
              <p className={styles.certamen}>
                {ficha.certamenNombre} · División {ficha.division}
              </p>
            )}
            <p className={styles.metaLinea}>
              {formatearCantidadSeguidores(ficha.seguidores)} · {ficha.ciudad.nombre} ·{' '}
              {obtenerEtiqueta('torneo.modalidad', ficha.modalidad).etiqueta}
            </p>
            <Badge campo="torneo.estado" valor={ficha.estado} />
          </div>
        </div>

        {/*
          D-04b: visibles sin sesión, el registro se pide recién al
          accionar (Seguir e Inscribir redirigen a /ingresar sin
          sesión). Compartir es funcional: no necesita cuenta.
        */}
        <div className={styles.accionesHero}>
          <BotonSeguir
            tipoSeguido="tournament"
            entidadId={id}
            cantidadSeguidoresInicial={ficha.seguidores}
            mostrarCantidad={false}
          />
          {ficha.estado === 'registration_open' && (
            <BotonInscribirEquipo torneoId={id} reglamentoVigente={reglamentoVigente} />
          )}
          <CompartirBoton titulo={ficha.nombre} url={`${urlDelSitio}/torneo/${id}`} />
        </div>
      </header>

      <nav className={styles.nav} aria-label="Secciones del torneo">
        <Link href={`/torneo/${id}`}>Ficha</Link>
        <Link href={`/torneo/${id}/fixture`}>Fixture</Link>
        <Link href={`/torneo/${id}/tabla`}>Tabla</Link>
        <Link href={`/torneo/${id}/estadisticas`}>Estadísticas</Link>
        {ficha.tieneReglamento && <Link href={`/torneo/${id}/reglamento`}>Reglamento</Link>}
      </nav>

      <main className={styles.contenido}>{children}</main>
    </div>
  );
}
