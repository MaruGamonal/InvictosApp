import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { esErrorDeAplicacion } from '@/lib/errores';
import { Badge } from '@/components/Badge';
import { obtenerContextoCacheado, obtenerGestionCacheada } from './_datos';
import { PestanasGestion } from './PestanasGestion';
import styles from './layout.module.css';

/**
 * Cabecera y navegación compartidas por las cinco pestañas de gestión
 * (diseño aprobado "Navegación Unificada" — reemplaza la pantalla
 * única y larga que era antes `/gestionar`): un único
 * `obtenerGestionCacheada` resuelve el guard de permisos, el nombre y
 * el estado para las cinco, sin repetir la consulta (`cache()` de
 * React en `_datos.ts`).
 *
 * Mismo guard que la pantalla anterior: sin sesión, a `/ingresar`; con
 * sesión pero sin permiso sobre este torneo, a la ficha pública — un
 * Colaborador asignado tiene sus tres acciones fijas (`06`, D-32) pero
 * no esta pantalla completa.
 */
export default async function LayoutGestionar({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contexto = await obtenerContextoCacheado();
  if (!contexto.usuarioId) redirect('/ingresar');

  let gestion;
  try {
    gestion = await obtenerGestionCacheada(id);
  } catch (error) {
    if (
      esErrorDeAplicacion(error) &&
      (error.codigo === 'SIN_PERMISO' || error.codigo === 'NO_ENCONTRADO')
    ) {
      redirect(`/torneo/${id}`);
    }
    throw error;
  }

  return (
    <div className={styles.pagina}>
      <header className={styles.hero}>
        <div className={styles.filaSuperior}>
          <Link
            href={`/torneo/${id}`}
            className={styles.enlaceVolver}
            aria-label="Volver a la ficha del torneo"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 5-7 7 7 7" />
            </svg>
          </Link>
          <span className={styles.pillEstado}>
            <Badge campo="torneo.estado" valor={gestion.estado} />
          </span>
        </div>
        <h1 className={`fuente-display ${styles.titulo}`}>{gestion.nombre}</h1>
        <PestanasGestion torneoId={id} />
      </header>

      <main className={styles.contenido}>{children}</main>
    </div>
  );
}
