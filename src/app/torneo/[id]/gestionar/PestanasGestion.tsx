'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './layout.module.css';

const PESTANAS = [
  { segmento: 'resumen', etiqueta: 'Resumen' },
  { segmento: 'equipos', etiqueta: 'Equipos' },
  { segmento: 'fixture', etiqueta: 'Fixture' },
  { segmento: 'resultados', etiqueta: 'Resultados' },
  { segmento: 'configuracion', etiqueta: 'Config.' },
] as const;

/**
 * Navegación entre las cinco secciones de gestión (reemplaza la
 * pantalla única y larga que era `/gestionar`, diseño aprobado
 * "Navegación Unificada"). Cliente porque necesita saber cuál pestaña
 * está activa — `usePathname()` en vez de recibir `activo` por prop
 * evita repetirlo en cada una de las cinco páginas.
 */
export function PestanasGestion({ torneoId }: { torneoId: string }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Secciones de gestión">
      {PESTANAS.map((pestana) => {
        const href = `/torneo/${torneoId}/gestionar/${pestana.segmento}`;
        const activa = pathname === href;
        return (
          <Link
            key={pestana.segmento}
            href={href}
            className={activa ? styles.pestanaActiva : styles.pestana}
            aria-current={activa ? 'page' : undefined}
          >
            {pestana.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
