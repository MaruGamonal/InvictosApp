import type { ReactNode } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { Escudo } from '@/components/Escudo';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { obtenerFichaOFallar } from './_datos';
import styles from './layout.module.css';

/**
 * Cabecera y navegación compartidas por las cuatro rutas públicas del
 * torneo (`10`, sección 5): un único fetch cacheado de la ficha
 * (`_datos.ts`) resuelve nombre, estado e imagen para las cuatro, sin
 * repetir el trabajo — Next dedupe por la misma clave de caché dentro
 * del mismo request. Densidad amplia acá, compacta en el contenido de
 * cada pestaña (`08`, 6.5).
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

  return (
    <div className={styles.pagina}>
      <header className={styles.hero}>
        <div className={styles.heroContenido}>
          <Escudo src={ficha.imagenUrl} nombre={ficha.nombre} tamano={64} />
          <div className={styles.heroTexto}>
            <h1 className={`${styles.nombre} fuente-display`}>{ficha.nombre}</h1>
            <div className={styles.meta}>
              <span>{ficha.ciudad.nombre}</span>
              <span className={styles.punto}>
                {obtenerEtiqueta('torneo.modalidad', ficha.modalidad).etiqueta}
              </span>
              <Badge campo="torneo.estado" valor={ficha.estado} />
            </div>
          </div>
        </div>
      </header>

      <nav className={styles.nav} aria-label="Secciones del torneo">
        <Link href={`/torneo/${id}`}>Ficha</Link>
        <Link href={`/torneo/${id}/fixture`}>Fixture</Link>
        <Link href={`/torneo/${id}/tabla`}>Tabla</Link>
        {ficha.tieneReglamento && <Link href={`/torneo/${id}/reglamento`}>Reglamento</Link>}
      </nav>

      <main className={styles.contenido}>{children}</main>
    </div>
  );
}
