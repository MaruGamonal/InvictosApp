'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import type { PendientesPorPestana } from './_pendientes';
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
 *
 * **El contador es la señal de estado persistente.** El Resumen dice en
 * detalle qué está trabado, pero alguien parado en Fixture no tiene por
 * qué volver al Resumen para enterarse de que hay tres equipos
 * esperando respuesta. El número va en la pestaña: se ve desde las
 * cinco, no ocupa una línea propia —en un teléfono eso serían cinco
 * pantallas con una franja menos de contenido— y señala exactamente
 * adónde ir.
 */
export function PestanasGestion({
  torneoId,
  pendientes,
}: {
  torneoId: string;
  pendientes: PendientesPorPestana;
}) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Secciones de gestión">
      {PESTANAS.map((pestana) => {
        const href = `/torneo/${torneoId}/gestionar/${pestana.segmento}`;
        // `startsWith` y no `===`: Configuración tiene una pantalla por
        // sección (`configuracion/formato`, …) y la pestaña tiene que
        // seguir marcada adentro de cualquiera de ellas.
        const activa = pathname === href || pathname.startsWith(`${href}/`);
        const cuantos =
          pestana.segmento === 'equipos' ||
          pestana.segmento === 'fixture' ||
          pestana.segmento === 'resultados'
            ? pendientes[pestana.segmento]
            : 0;
        return (
          <Link
            key={pestana.segmento}
            href={href}
            className={activa ? styles.pestanaActiva : styles.pestana}
            aria-current={activa ? 'page' : undefined}
          >
            {pestana.etiqueta}
            {cuantos > 0 && (
              <span className={styles.contadorPestana}>
                {cuantos}
                {/* El número solo no dice de qué es: un lector de
                    pantalla anunciaría "Equipos 3". */}
                <span className={styles.srOnly}>
                  {` ${cuantos === 1 ? 'pendiente' : 'pendientes'}`}
                </span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
